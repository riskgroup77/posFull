#!/bin/sh
set -e

python manage.py migrate --noinput

# Faqat SEED_DATABASE=true bo'lganda demo ma'lumot yuklanadi (productionda false!)
if [ "$SEED_DATABASE" = "true" ]; then
  python manage.py reset_minimal
fi

exec gunicorn pos_project.wsgi:application --bind 0.0.0.0:8000 --workers 3 --timeout 120
