from django.core.management.base import BaseCommand
from apps.users.models import Interest


INTERESTS = [
    # Música
    ('Música', '🎵', 'Entretenimiento'),
    ('Conciertos', '🎸', 'Entretenimiento'),
    ('DJ', '🎧', 'Entretenimiento'),
    ('Karaoke', '🎤', 'Entretenimiento'),
    # Deportes
    ('Fútbol', '⚽', 'Deportes'),
    ('Tenis', '🎾', 'Deportes'),
    ('Natación', '🏊', 'Deportes'),
    ('Ciclismo', '🚴', 'Deportes'),
    ('Yoga', '🧘', 'Deportes'),
    ('Gym', '🏋️', 'Deportes'),
    ('Surf', '🏄', 'Deportes'),
    ('Senderismo', '🥾', 'Deportes'),
    # Arte y cultura
    ('Arte', '🎨', 'Cultura'),
    ('Fotografía', '📸', 'Cultura'),
    ('Cine', '🎬', 'Cultura'),
    ('Teatro', '🎭', 'Cultura'),
    ('Museos', '🏛️', 'Cultura'),
    ('Lectura', '📚', 'Cultura'),
    # Comida
    ('Gastronomía', '🍽️', 'Comida'),
    ('Cocina', '👨‍🍳', 'Comida'),
    ('Vino', '🍷', 'Comida'),
    ('Café', '☕', 'Comida'),
    ('Sushi', '🍣', 'Comida'),
    # Viajes
    ('Viajes', '✈️', 'Viajes'),
    ('Playa', '🏖️', 'Viajes'),
    ('Mochilero', '🎒', 'Viajes'),
    ('Naturaleza', '🌿', 'Viajes'),
    # Tecnología
    ('Tecnología', '💻', 'Tecnología'),
    ('Gaming', '🎮', 'Tecnología'),
    ('Startups', '🚀', 'Tecnología'),
    # Social
    ('Baile', '💃', 'Social'),
    ('Salsa', '🕺', 'Social'),
    ('Fiestas', '🎉', 'Social'),
    ('Meditación', '🧠', 'Social'),
    # Mascotas
    ('Perros', '🐕', 'Mascotas'),
    ('Gatos', '🐱', 'Mascotas'),
]


class Command(BaseCommand):
    help = 'Carga los intereses predefinidos en la base de datos'

    def handle(self, *args, **options):
        created = 0
        for name, emoji, category in INTERESTS:
            _, was_created = Interest.objects.get_or_create(
                name=name,
                defaults={'emoji': emoji, 'category': category}
            )
            if was_created:
                created += 1

        self.stdout.write(self.style.SUCCESS(
            f'✅ {created} intereses creados. Total: {Interest.objects.count()}'
        ))
