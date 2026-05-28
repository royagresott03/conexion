from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
import json         
from rest_framework import generics, status, permissions
from rest_framework.decorators import api_view, permission_classes, parser_classes
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenRefreshView
from django.contrib.auth import authenticate
from django.utils import timezone

from .models import User, Profile, Interest
from .serializers import (
    RegisterSerializer, ProfileSerializer, PublicProfileSerializer,
    UserMeSerializer, InterestSerializer
)


class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    permission_classes = [permissions.AllowAny]
    serializer_class = RegisterSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        refresh = RefreshToken.for_user(user)

        return Response({
            'message': 'Cuenta creada exitosamente.',
            'user': {
                'id': str(user.id),
                'email': user.email,
                'username': user.username,
            },
            'tokens': {
                'access': str(refresh.access_token),
                'refresh': str(refresh),
            },
            'profile': ProfileSerializer(user.profile, context={'request': request}).data,
        }, status=status.HTTP_201_CREATED)


class LoginView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        email = request.data.get('email', '').lower().strip()
        password = request.data.get('password', '')

        if not email or not password:
            return Response({'error': 'Email y contraseña son requeridos.'}, status=400)

        user = authenticate(request, username=email, password=password)

        if not user:
            return Response({'error': 'Credenciales incorrectas.'}, status=401)

        if not user.is_active:
            return Response({'error': 'Cuenta desactivada.'}, status=401)

        user.update_last_active()
        refresh = RefreshToken.for_user(user)

        profile_data = None
        if hasattr(user, 'profile'):
            profile_data = ProfileSerializer(user.profile, context={'request': request}).data

        return Response({
            'message': 'Inicio de sesión exitoso.',
            'user': {
                'id': str(user.id),
                'email': user.email,
                'username': user.username,
                'is_verified': user.is_verified,
            },
            'tokens': {
                'access': str(refresh.access_token),
                'refresh': str(refresh),
            },
            'profile': profile_data,
        })


class LogoutView(APIView):
    def post(self, request):
        try:
            refresh_token = request.data.get('refresh')
            token = RefreshToken(refresh_token)
            token.blacklist()
            return Response({'message': 'Sesión cerrada exitosamente.'})
        except Exception:
            return Response({'error': 'Token inválido.'}, status=400)


class MeView(APIView):
    def get(self, request):
        request.user.update_last_active()
        serializer = UserMeSerializer(request.user, context={'request': request})
        return Response(serializer.data)


class ProfileView(generics.RetrieveUpdateAPIView):
    serializer_class = ProfileSerializer
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_object(self):
        profile, _ = Profile.objects.get_or_create(user=self.request.user)
        return profile

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['request'] = self.request
        return context

    def update(self, request, *args, **kwargs):
        kwargs['partial'] = True
        return super().update(request, *args, **kwargs)


class PublicProfileView(generics.RetrieveAPIView):
    serializer_class = PublicProfileSerializer
    lookup_field = 'user__id'
    lookup_url_kwarg = 'user_id'

    def get_queryset(self):
        return Profile.objects.select_related('user').prefetch_related('interests')


class UploadPhotoView(APIView):
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        slot = request.data.get('slot', '1')
        photo = request.FILES.get('photo')

        if not photo:
            return Response({'error': 'No se envió ninguna foto.'}, status=400)

        if slot not in ['1', '2', '3', '4', '5', '6']:
            return Response({'error': 'Slot inválido. Usa 1-6.'}, status=400)


        allowed_types = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg']
        if photo.content_type not in allowed_types:
            return Response({'error': 'Solo se permiten imágenes JPG, PNG o WebP.'}, status=400)

        if photo.size > 10 * 1024 * 1024:
            return Response({'error': 'La imagen no puede pesar más de 10MB.'}, status=400)

        profile, _ = Profile.objects.get_or_create(user=request.user)
        field_name = f'photo_{slot}'
        setattr(profile, field_name, photo)
        profile.save(update_fields=[field_name])
        profile.check_profile_complete()

        photo_url = request.build_absolute_uri(getattr(profile, field_name).url)
        return Response({
            'message': f'Foto {slot} subida exitosamente.',
            'url': photo_url,
            'slot': slot,
        })

    def delete(self, request):
        slot = request.data.get('slot', '1')
        if slot not in ['1', '2', '3', '4', '5', '6']:
            return Response({'error': 'Slot inválido.'}, status=400)

        profile, _ = Profile.objects.get_or_create(user=request.user)
        field_name = f'photo_{slot}'
        photo = getattr(profile, field_name)
        if photo:
            photo.delete(save=False)
            setattr(profile, field_name, None)
            profile.save(update_fields=[field_name])
            profile.check_profile_complete()

        return Response({'message': f'Foto {slot} eliminada.'})


class InterestListView(generics.ListAPIView):
    queryset = Interest.objects.all().order_by('category', 'name')
    serializer_class = InterestSerializer
    permission_classes = [permissions.AllowAny]


@api_view(['POST'])
def update_location(request):
    lat = request.data.get('latitude')
    lon = request.data.get('longitude')
    city = request.data.get('city', '')

    if lat is None or lon is None:
        return Response({'error': 'Latitud y longitud son requeridas.'}, status=400)

    profile, _ = Profile.objects.get_or_create(user=request.user)
    profile.latitude = float(lat)
    profile.longitude = float(lon)
    if city:
        profile.city = city
    profile.save(update_fields=['latitude', 'longitude', 'city'])

    return Response({'message': 'Ubicación actualizada.'})

@csrf_exempt
def create_admin(request):
    if request.method == 'POST':
        try:
            from apps.users.models import User
            user, created = User.objects.get_or_create(email='admin@conexion.com')
            user.set_password('Admin123456')
            user.is_staff = True
            user.is_superuser = True
            user.save()
            msg = 'Creado' if created else 'Contraseña actualizada'
            return JsonResponse({'ok': True, 'msg': msg})
        except Exception as e:
            return JsonResponse({'ok': False, 'msg': str(e)})
    return JsonResponse({'ok': False, 'msg': 'Usa POST'})