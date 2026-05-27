import uuid
import os
from django.db import models
from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin, BaseUserManager
from django.utils import timezone


class UserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError('El email es requerido')
        email = self.normalize_email(email)
        extra_fields.setdefault('is_active', True)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        return self.create_user(email, password, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(unique=True)
    username = models.CharField(max_length=50, unique=True, blank=True)
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    is_verified = models.BooleanField(default=False)
    is_premium = models.BooleanField(default=False)
    email_confirmed = models.BooleanField(default=False)
    created_at = models.DateTimeField(default=timezone.now)
    last_active = models.DateTimeField(default=timezone.now)

    objects = UserManager()

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = []

    class Meta:
        db_table = 'users_user'
        verbose_name = 'Usuario'
        verbose_name_plural = 'Usuarios'

    def __str__(self):
        return self.email

    def update_last_active(self):
        self.last_active = timezone.now()
        self.save(update_fields=['last_active'])


def profile_photo_upload(instance, filename):
    ext = filename.split('.')[-1]
    filename = f'{uuid.uuid4()}.{ext}'
    return os.path.join('profiles', str(instance.user.id), filename)


class Interest(models.Model):
    name = models.CharField(max_length=50, unique=True)
    emoji = models.CharField(max_length=10, blank=True)
    category = models.CharField(max_length=30, blank=True)

    class Meta:
        db_table = 'users_interest'
        ordering = ['name']

    def __str__(self):
        return f'{self.emoji} {self.name}'


class Profile(models.Model):
    GENDER_CHOICES = [
        ('M', 'Hombre'),
        ('F', 'Mujer'),
        ('NB', 'No binario'),
        ('O', 'Otro'),
    ]
    ORIENTATION_CHOICES = [
        ('straight', 'Heterosexual'),
        ('gay', 'Gay/Lesbiana'),
        ('bisexual', 'Bisexual'),
        ('other', 'Otro'),
    ]
    LOOKING_FOR_CHOICES = [
        ('serious', 'Algo serio'),
        ('casual', 'Citas casuales'),
        ('friends', 'Amistades'),
        ('any', 'Cualquier cosa'),
    ]

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    # Basic info
    first_name = models.CharField(max_length=50)
    last_name = models.CharField(max_length=50, blank=True)
    birth_date = models.DateField(null=True, blank=True)
    gender = models.CharField(max_length=5, choices=GENDER_CHOICES, blank=True)
    orientation = models.CharField(max_length=15, choices=ORIENTATION_CHOICES, default='straight')
    looking_for = models.CharField(max_length=15, choices=LOOKING_FOR_CHOICES, default='any')
    bio = models.TextField(max_length=500, blank=True)
    occupation = models.CharField(max_length=100, blank=True)
    # Location
    city = models.CharField(max_length=100, blank=True)
    country = models.CharField(max_length=100, blank=True, default='Colombia')
    latitude = models.FloatField(null=True, blank=True)
    longitude = models.FloatField(null=True, blank=True)
    # Photos - up to 6
    photo_1 = models.ImageField(upload_to=profile_photo_upload, null=True, blank=True)
    photo_2 = models.ImageField(upload_to=profile_photo_upload, null=True, blank=True)
    photo_3 = models.ImageField(upload_to=profile_photo_upload, null=True, blank=True)
    photo_4 = models.ImageField(upload_to=profile_photo_upload, null=True, blank=True)
    photo_5 = models.ImageField(upload_to=profile_photo_upload, null=True, blank=True)
    photo_6 = models.ImageField(upload_to=profile_photo_upload, null=True, blank=True)
    # Interests
    interests = models.ManyToManyField(Interest, blank=True, related_name='profiles')
    # Preferences
    min_age_preference = models.IntegerField(default=18)
    max_age_preference = models.IntegerField(default=45)
    max_distance_km = models.IntegerField(default=50)
    show_gender = models.CharField(max_length=5, choices=GENDER_CHOICES + [('A', 'Todos')], default='A')
    # Profile completion
    profile_complete = models.BooleanField(default=False)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'users_profile'
        verbose_name = 'Perfil'
        verbose_name_plural = 'Perfiles'

    def __str__(self):
        return f'{self.first_name} ({self.user.email})'

    @property
    def age(self):
        if not self.birth_date:
            return None
        from datetime import date
        today = date.today()
        return today.year - self.birth_date.year - (
            (today.month, today.day) < (self.birth_date.month, self.birth_date.day)
        )

    @property
    def main_photo_url(self):
        for field in ['photo_1', 'photo_2', 'photo_3']:
            photo = getattr(self, field)
            if photo:
                return photo.url
        return None

    def get_photos(self):
        photos = []
        for i in range(1, 7):
            photo = getattr(self, f'photo_{i}')
            if photo:
                photos.append(photo.url)
        return photos

    def check_profile_complete(self):
        required = [self.first_name, self.birth_date, self.gender, self.city, self.bio]
        complete = all(required) and self.main_photo_url is not None
        self.profile_complete = complete
        self.save(update_fields=['profile_complete'])
        return complete
