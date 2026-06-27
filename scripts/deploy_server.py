#!/usr/bin/env python3
"""POS tizimini serverga deploy qilish (boshqa nginx/dasturlarga tegmasdan)."""
import os
import secrets
import sys
import textwrap
import time

import paramiko

HOST = os.environ.get('DEPLOY_HOST', '5.199.162.5')
USER = os.environ.get('DEPLOY_USER', 'root')
PASSWORD = os.environ.get('DEPLOY_PASSWORD', '')
REPO = 'https://github.com/riskgroup77/posFull.git'
APP_DIR = '/var/www/pos'


def run(ssh, cmd, check=True, timeout=600):
    print(f'\n>>> {cmd}')
    stdin, stdout, stderr = ssh.exec_command(cmd, timeout=timeout)
    out = stdout.read().decode(errors='replace')
    err = stderr.read().decode(errors='replace')
    code = stdout.channel.recv_exit_status()
    if out.strip():
        print(out.strip())
    if err.strip():
        print(err.strip())
    if check and code != 0:
        raise RuntimeError(f'Command failed ({code}): {cmd}')
    return out, err, code


def upload_text(sftp, path, content):
    print(f'Uploading {path}')
    with sftp.file(path, 'w') as f:
        f.write(content)


def main():
    if not PASSWORD:
        print('DEPLOY_PASSWORD env kerak', file=sys.stderr)
        sys.exit(1)

    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(HOST, username=USER, password=PASSWORD, timeout=30)
    sftp = ssh.open_sftp()

    run(ssh, f'mkdir -p {APP_DIR}')
    _, _, code = run(ssh, f'test -d {APP_DIR}/.git', check=False)
    if code != 0:
        run(ssh, f'rm -rf {APP_DIR}/* {APP_DIR}/.[!.]* 2>/dev/null; git clone {REPO} {APP_DIR}')
    else:
        run(ssh, f'cd {APP_DIR} && git fetch origin && git reset --hard origin/main')

    # Backend .env (faqat serverda)
    env_path = f'{APP_DIR}/backend/.env'
    _, _, env_exists = run(ssh, f'test -f {env_path}', check=False)
    if env_exists != 0:
        secret = secrets.token_urlsafe(48)
        pg_pass = secrets.token_urlsafe(24)
        env_content = textwrap.dedent(f"""\
            DJANGO_SECRET_KEY={secret}
            DJANGO_DEBUG=False
            DJANGO_ALLOWED_HOSTS=posapi.devflix.uz,localhost,127.0.0.1
            CORS_ALLOWED_ORIGINS=https://pos.devflix.uz
            CSRF_TRUSTED_ORIGINS=https://pos.devflix.uz,https://posapi.devflix.uz
            DATABASE_URL=postgres://pos:{pg_pass}@db:5432/pos
            SEED_DATABASE=false
        """)
        upload_text(sftp, env_path, env_content)
        upload_text(sftp, f'{APP_DIR}/.env.deploy', f'POSTGRES_PASSWORD={pg_pass}\n')

    run(ssh, f'cd {APP_DIR} && export $(grep -v "^#" .env.deploy | xargs) && docker compose -f docker-compose.server.yml up -d --build', timeout=900)

    # Birinchi deployda foydalanuvchilar
    out, _, _ = run(ssh, f'cd {APP_DIR} && docker compose -f docker-compose.server.yml exec -T backend python manage.py shell -c "from django.contrib.auth import get_user_model; print(get_user_model().objects.count())"', check=False, timeout=120)
    if out.strip() == '0':
        run(ssh, f'cd {APP_DIR} && docker compose -f docker-compose.server.yml exec -T backend python manage.py reset_minimal', timeout=120)

    # Frontend build
    run(ssh, f'cd {APP_DIR} && npm ci && npm run build', timeout=900)

    # Nginx — faqat yangi fayllar
    run(ssh, f'cp {APP_DIR}/deploy/nginx-pos.devflix.uz.conf /etc/nginx/sites-available/pos.devflix.uz')
    run(ssh, f'cp {APP_DIR}/deploy/nginx-posapi.devflix.uz.conf /etc/nginx/sites-available/posapi.devflix.uz')
    run(ssh, 'ln -sf /etc/nginx/sites-available/pos.devflix.uz /etc/nginx/sites-enabled/pos.devflix.uz')
    run(ssh, 'ln -sf /etc/nginx/sites-available/posapi.devflix.uz /etc/nginx/sites-enabled/posapi.devflix.uz')
    run(ssh, 'nginx -t')
    run(ssh, 'systemctl reload nginx')

    # SSL (mavjud cert bo'lmasa)
    _, _, cert_code = run(ssh, 'test -d /etc/letsencrypt/live/pos.devflix.uz', check=False)
    if cert_code != 0:
        run(
            ssh,
            'certbot --nginx -d pos.devflix.uz -d posapi.devflix.uz --non-interactive --agree-tos -m riskgroup77@gmail.com --redirect',
            timeout=300,
        )
    else:
        run(ssh, 'certbot renew --quiet || true', check=False)

    run(ssh, 'curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:8020/api/auth/login/ -X POST -H "Content-Type: application/json" -d \'{"email":"x","password":"x"}\' || true', check=False)

    sftp.close()
    ssh.close()
    print('\n=== DEPLOY TUGADI ===')
    print('Frontend: https://pos.devflix.uz')
    print('API:      https://posapi.devflix.uz/api')


if __name__ == '__main__':
    main()
