#!/bin/bash
set -e

echo "⏳ Esperando a PostgreSQL..."
while ! pg_isready -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" > /dev/null 2>&1; do
    sleep 2
done
echo "✅ PostgreSQL listo"

echo "📦 Generando migraciones..."
python manage.py makemigrations users --noinput
python manage.py makemigrations matches --noinput
python manage.py makemigrations chat --noinput
python manage.py makemigrations streaks --noinput
python manage.py makemigrations notifications --noinput
python manage.py makemigrations verification --noinput

echo "📦 Aplicando migraciones..."
python manage.py migrate --noinput

echo "🌱 Cargando intereses..."
python manage.py seed_interests

echo "🚀 Iniciando servidor..."
exec python manage.py runserver 0.0.0.0:8000
