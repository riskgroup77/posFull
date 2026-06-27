#!/usr/bin/env python3
"""To'liq deploy: git pull, backend rebuild, frontend build, nginx reload."""
import os
import sys

import paramiko

sys.stdout.reconfigure(encoding='utf-8', errors='replace')

HOST = os.environ.get('DEPLOY_HOST', '5.199.162.5')
USER = os.environ.get('DEPLOY_USER', 'root')
PASSWORD = os.environ.get('DEPLOY_PASSWORD', '')
APP_DIR = '/var/www/pos'

if not PASSWORD:
    print('DEPLOY_PASSWORD muhit o\'zgaruvchisi talab qilinadi', file=sys.stderr)
    sys.exit(1)


def run(ssh, cmd, timeout=900):
    print(f'\n>>> {cmd}')
    _, o, e = ssh.exec_command(cmd, timeout=timeout)
    out = o.read().decode('utf-8', errors='replace')
    err = e.read().decode('utf-8', errors='replace')
    code = o.channel.recv_exit_status()
    if out.strip():
        print(out)
    if err.strip():
        print(err)
    if code != 0:
        raise RuntimeError(f'Buyruq xato ({code}): {cmd}')
    return out


def main():
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(HOST, username=USER, password=PASSWORD, timeout=30)

    run(ssh, f'cd {APP_DIR} && git pull origin main')
    run(ssh, f'cd {APP_DIR} && set -a && source .env.deploy 2>/dev/null; set +a; docker compose -f docker-compose.server.yml up -d --build')
    run(ssh, f'cd {APP_DIR} && npm ci && npm run build')
    run(ssh, f'cp {APP_DIR}/deploy/nginx-pos.devflix.uz.conf /etc/nginx/sites-available/pos.devflix.uz')
    run(ssh, f'cp {APP_DIR}/deploy/nginx-posapi.devflix.uz.conf /etc/nginx/sites-available/posapi.devflix.uz')
    run(ssh, 'nginx -t')
    run(ssh, 'systemctl reload nginx')

    for url in [
        'https://pos.devflix.uz/',
        'https://posapi.devflix.uz/api/health/',
    ]:
        run(ssh, f'curl -sk -o /dev/null -w "{url} -> %{{http_code}}\\n" {url}', timeout=60)

    ssh.close()
    print('\nDeploy muvaffaqiyatli.')


if __name__ == '__main__':
    main()
