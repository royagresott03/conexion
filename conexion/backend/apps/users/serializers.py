from rest_framework import serializers
from django.contrib.auth.password_validation import validate_password
from django.utils import timezone
from .models import User, Profile, Interest


class InterestSerializer(serializers.ModelSerializer):
    class Meta:
        model = Interest
        fields = ['id', 'name', 'emoji', 'category']


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, validators=[validate_password])
    password2 = serializers.CharField(write_only=True)
    first_name = serializers.CharField(max_length=50)
    birth_date = serializers.DateField(required=False, allow_null=True)
    gender = serializers.CharField(max_length=5, required=False, allow_blank=True)
    city = serializers.CharField(max_length=100, required=False, allow_blank=True)

    class Meta:
        model = User
        fields = ['email', 'password', 'password2', 'first_name', 'birth_date', 'gender', 'city']

    def validate(self, attrs):
        if attrs['password'] != attrs.pop('password2'):
            raise serializers.ValidationError({'password': 'Las contraseñas no coinciden.'})
        return attrs

    def validate_email(self, value):
        if User.objects.filter(email=value.lower()).exists():
            raise serializers.ValidationError('Ya existe una cuenta con este email.')
        return value.lower()

    def create(self, validated_data):
        # Extract profile fields
        first_name = validated_data.pop('first_name')
        birth_date = validated_data.pop('birth_date', None)
        gender = validated_data.pop('gender', '')
        city = validated_data.pop('city', '')

        # Create user
        email = validated_data['email']
        username = email.split('@')[0]
        base_username = username
        counter = 1
        while User.objects.filter(username=username).exists():
            username = f'{base_username}{counter}'
            counter += 1

        user = User.objects.create_user(
            email=email,
            password=validated_data['password'],
            username=username,
        )

        # Auto-create profile
        Profile.objects.create(
            user=user,
            first_name=first_name,
            birth_date=birth_date,
            gender=gender,
            city=city,
        )

        return user


class ProfileSerializer(serializers.ModelSerializer):
    interests = InterestSerializer(many=True, read_only=True)
    interest_ids = serializers.PrimaryKeyRelatedField(
        many=True, queryset=Interest.objects.all(), write_only=True,
        source='interests', required=False
    )
    age = serializers.ReadOnlyField()
    main_photo_url = serializers.ReadOnlyField()
    photos = serializers.SerializerMethodField()
    email = serializers.EmailField(source='user.email', read_only=True)
    is_verified = serializers.BooleanField(source='user.is_verified', read_only=True)
    user_id = serializers.UUIDField(source='user.id', read_only=True)

    class Meta:
        model = Profile
        fields = [
            'user_id', 'email', 'first_name', 'last_name', 'birth_date', 'age',
            'gender', 'orientation', 'looking_for', 'bio', 'occupation',
            'city', 'country', 'latitude', 'longitude',
            'photo_1', 'photo_2', 'photo_3', 'photo_4', 'photo_5', 'photo_6',
            'photos', 'main_photo_url',
            'interests', 'interest_ids',
            'min_age_preference', 'max_age_preference', 'max_distance_km', 'show_gender',
            'profile_complete', 'is_verified', 'created_at', 'updated_at',
        ]
        read_only_fields = ['profile_complete', 'created_at', 'updated_at']
        extra_kwargs = {
            'photo_1': {'required': False},
            'photo_2': {'required': False},
            'photo_3': {'required': False},
            'photo_4': {'required': False},
            'photo_5': {'required': False},
            'photo_6': {'required': False},
        }

    def get_photos(self, obj):
        request = self.context.get('request')
        photos = []
        for i in range(1, 7):
            photo = getattr(obj, f'photo_{i}')
            if photo:
                url = photo.url
                if request:
                    url = request.build_absolute_uri(url)
                photos.append({'index': i, 'url': url})
        return photos

    def update(self, instance, validated_data):
        instance = super().update(instance, validated_data)
        instance.check_profile_complete()
        return instance


class PublicProfileSerializer(serializers.ModelSerializer):
    """Serializer for viewing other users' profiles (no private fields)"""
    interests = InterestSerializer(many=True, read_only=True)
    age = serializers.ReadOnlyField()
    photos = serializers.SerializerMethodField()
    main_photo_url = serializers.ReadOnlyField()
    is_verified = serializers.BooleanField(source='user.is_verified', read_only=True)
    user_id = serializers.UUIDField(source='user.id', read_only=True)

    class Meta:
        model = Profile
        fields = [
            'user_id', 'first_name', 'age', 'gender', 'orientation',
            'looking_for', 'bio', 'occupation', 'city', 'country',
            'photos', 'main_photo_url', 'interests', 'is_verified',
        ]

    def get_photos(self, obj):
        request = self.context.get('request')
        photos = []
        for i in range(1, 7):
            photo = getattr(obj, f'photo_{i}')
            if photo:
                url = photo.url
                if request:
                    url = request.build_absolute_uri(url)
                photos.append({'index': i, 'url': url})
        return photos


class UserMeSerializer(serializers.ModelSerializer):
    profile = ProfileSerializer(read_only=True)

    class Meta:
        model = User
        fields = ['id', 'email', 'username', 'is_verified', 'is_premium',
                  'email_confirmed', 'created_at', 'last_active', 'profile']
