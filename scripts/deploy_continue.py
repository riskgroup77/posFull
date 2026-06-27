#!/usr/bin/env python3
"""Deploy qadamlarini davom ettirish."""
import os
import sys

import paramiko

HOST = os.environ.get('DEPLOY_HOST', '5.199.162.5')
PASSWORD = os.environ.get('DEPLOY_PASSWORD', '')
APP_DIR = '/var/www/pos'


def run(ssh, cmd, check=True, timeout=900):
    print(f'\n>>> {cmd}')
    stdin, stdout, stderr = ssh.exec_command(cmd, timeout=timeout)
    out = stdout.read().decode('utf-8', errors='replace')
    err = stderr.read().decode('utf-8', errors='replace')
    code = stdout.channel.recv_exit_status()
    if out.strip():
        sys.stdout.buffer.write(out.encode('utf-8', errors='replace'))
        sys.stdout.buffer.write(b'\n')
    if err.strip():
        sys.stdout.buffer.write(err.encode('utf-8', errors='replace'))
        sys.stdout.buffer.write(b'\n')
    if check and code != 0:
        raise RuntimeError(f'Failed ({code}): {cmd}')
    return out, err, code


def main():
    if not PASSWORD:
        print('DEPLOY_PASSWORD kerak', file=sys.stderr)
        sys.exit(1)

    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(HOST, username='root', password=PASSWORD, timeout=30)

    run(ssh, f'cd {APP_DIR} && npm ci && npm run build', timeout=900)

    run(ssh, f'cp {APP_DIR}/deploy/nginx-pos.devflix.uz.conf /etc/nginx/sites-available/pos.devflix.uz')
    run(ssh, f'cp {APP_DIR}/deploy/nginx-posapi.devflix.uz.conf /etc/nginx/sites-available/posapi.devflix.uz')
    run(ssh, 'ln -sf /etc/nginx/sites-available/pos.devflix.uz /etc/nginx/sites-enabled/pos.devflix.uz')
    run(ssh, 'ln -sf /etc/nginx/sites-available/posapi.devflix.uz /etc/nginx/sites-enabled/posapi.devflix.uz')
    run(ssh, 'nginx -t')
    run(ssh, 'systemctl reload nginx')

    _, _, cert_code = run(ssh, 'test -d /etc/letsencrypt/live/pos.devflix.uz', check=False)
    if cert_code != 0:
        run(ssh, 'certbot --nginx -d pos.devflix.uz -d posapi.devflix.uz --non-interactive --agree-tos -m riskgroup77@gmail.com --redirect', timeout=300)

    run(ssh, 'curl -sk -o /dev/null -w "%{http_code}" https://pos.devflix.uz/ || curl -s -o /dev/null -w "%{http_code}" http://pos.devflix.uz/', check=False)
    run(ssh, 'curl -sk -o /dev/null -w "%{http_code}" https://posapi.devflix.uz/api/health/', check=False)

    ssh.close()
    print('\n=== TAYYOR ===')


if __name__ == '__main__':
    main()
