import math
from django.db.models import Q
from django.utils import timezone
from datetime import timedelta
from .models import SwipeAction, Match
from apps.users.models import Profile


def haversine_distance(lat1, lon1, lat2, lon2):
    """Calculate distance in km between two coordinates."""
    R = 6371
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    return 2 * R * math.asin(math.sqrt(a))


def calculate_compatibility(profile_a, profile_b):
    """
    Returns a 0-100 compatibility score between two profiles.
    Weights: interests 35%, location 25%, age 15%, activity 15%, orientation 10%
    """
    score = 0.0

    # 1. Interests (35%)
    interests_a = set(profile_a.interests.values_list('id', flat=True))
    interests_b = set(profile_b.interests.values_list('id', flat=True))
    if interests_a or interests_b:
        union = len(interests_a | interests_b)
        intersection = len(interests_a & interests_b)
        jaccard = intersection / union if union else 0
        score += 35 * jaccard
    else:
        score += 10  # neutral if no interests set

    # 2. Location (25%)
    if profile_a.latitude and profile_a.longitude and profile_b.latitude and profile_b.longitude:
        dist = haversine_distance(
            profile_a.latitude, profile_a.longitude,
            profile_b.latitude, profile_b.longitude
        )
        max_dist = max(profile_a.max_distance_km, profile_b.max_distance_km, 1)
        location_score = max(0, 1 - (dist / max_dist))
        score += 25 * location_score
    else:
        score += 12  # neutral if no location

    # 3. Age compatibility (15%)
    age_a = profile_a.age
    age_b = profile_b.age
    if age_a and age_b:
        a_likes_b_age = profile_a.min_age_preference <= age_b <= profile_a.max_age_preference
        b_likes_a_age = profile_b.min_age_preference <= age_a <= profile_b.max_age_preference
        if a_likes_b_age and b_likes_a_age:
            score += 15
        elif a_likes_b_age or b_likes_a_age:
            score += 7
    else:
        score += 7

    # 4. Recent activity (15%)
    now = timezone.now()
    last_active = profile_b.user.last_active
    hours_ago = (now - last_active).total_seconds() / 3600
    if hours_ago < 1:
        activity_score = 1.0
    elif hours_ago < 24:
        activity_score = 0.8
    elif hours_ago < 72:
        activity_score = 0.5
    elif hours_ago < 168:
        activity_score = 0.3
    else:
        activity_score = 0.1
    score += 15 * activity_score

    # 5. Orientation compatibility (10%)
    def orientations_compatible(o1, o2, g1, g2):
        if o1 == 'straight' and o2 == 'straight':
            return g1 != g2
        if o1 == 'gay' and o2 == 'gay':
            return g1 == g2
        if 'bisexual' in [o1, o2]:
            return True
        return True  # default compatible

    if profile_a.gender and profile_b.gender:
        compat = orientations_compatible(
            profile_a.orientation, profile_b.orientation,
            profile_a.gender, profile_b.gender
        )
        score += 10 if compat else 0
    else:
        score += 5

    return round(min(score, 100), 2)


def get_discover_profiles(user, limit=20):
    """
    Returns profiles to show in the discover/swipe feed for a given user.
    Excludes: own profile, already swiped, blocked.
    Filters by preferences. Sorts by compatibility score.
    """
    my_profile = getattr(user, 'profile', None)
    if not my_profile:
        return Profile.objects.none()

    # IDs already swiped by this user
    already_swiped = SwipeAction.objects.filter(
        user_from=user
    ).values_list('user_to_id', flat=True)

    # Base queryset - exclude self and already swiped
    qs = Profile.objects.select_related('user').prefetch_related('interests').exclude(
        user=user
    ).exclude(
        user_id__in=already_swiped
    ).filter(
        user__is_active=True,
    )

    # Filter by gender preference
    if my_profile.show_gender and my_profile.show_gender != 'A':
        qs = qs.filter(gender=my_profile.show_gender)

    # Filter by age preference
    from datetime import date
    today = date.today()
    if my_profile.min_age_preference:
        max_birth = today.replace(year=today.year - my_profile.min_age_preference)
        qs = qs.filter(birth_date__lte=max_birth)
    if my_profile.max_age_preference:
        min_birth = today.replace(year=today.year - my_profile.max_age_preference)
        qs = qs.filter(birth_date__gte=min_birth)

    # Score and sort
    profiles_with_scores = []
    for profile in qs[:100]:  # score top 100, return best limit
        score = calculate_compatibility(my_profile, profile)
        profiles_with_scores.append((profile, score))

    profiles_with_scores.sort(key=lambda x: x[1], reverse=True)
    return [p for p, s in profiles_with_scores[:limit]], {p.user_id: s for p, s in profiles_with_scores[:limit]}


def process_swipe(user_from, user_to_id, action):
    """
    Process a swipe action. Returns (swipe, match_created, match_obj).
    If both users liked each other → create Match + Conversation.
    """
    from django.contrib.auth import get_user_model
    User = get_user_model()

    try:
        user_to = User.objects.get(id=user_to_id)
    except User.DoesNotExist:
        return None, False, None

    # Save swipe (update if exists)
    swipe, _ = SwipeAction.objects.update_or_create(
        user_from=user_from,
        user_to=user_to,
        defaults={'action': action}
    )

    match_created = False
    match_obj = None

    if action in ('like', 'superlike'):
        # Check if the other person already liked us
        reverse_like = SwipeAction.objects.filter(
            user_from=user_to,
            user_to=user_from,
            action__in=['like', 'superlike']
        ).exists()

        if reverse_like:
            # Ensure consistent ordering (smaller UUID first)
            u1, u2 = sorted([user_from, user_to], key=lambda u: str(u.id))

            # Get compatibility score
            try:
                profile_a = user_from.profile
                profile_b = user_to.profile
                compat_score = calculate_compatibility(profile_a, profile_b)
            except Exception:
                compat_score = 50.0

            match_obj, match_created = Match.objects.get_or_create(
                user_1=u1,
                user_2=u2,
                defaults={'compatibility_score': compat_score}
            )

            if match_created:
                # Auto-create conversation
                from apps.chat.models import Conversation
                conv = Conversation.objects.create(match=match_obj)
                conv.participants.set([user_from, user_to])

                # Create streak
                from apps.streaks.models import Streak
                Streak.objects.create(conversation=conv)

    return swipe, match_created, match_obj
