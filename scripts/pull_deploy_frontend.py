#!/usr/bin/env python3
"""Frontendni serverga pull + build qilish."""
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

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect(HOST, username=USER, password=PASSWORD, timeout=30)

cmds = [
    f'cd {APP_DIR} && git pull origin main',
    f'cd {APP_DIR} && npm ci && npm run build',
    'curl -sk -o /dev/null -w "frontend:%{http_code}\\n" https://pos.devflix.uz/',
    'curl -sk -o /dev/null -w "api_health:%{http_code}\\n" https://posapi.devflix.uz/api/health/',
]
for cmd in cmds:
    print('>>>', cmd)
    _, o, e = c.exec_command(cmd, timeout=300)
    out = o.read().decode('utf-8', errors='replace')
    err = e.read().decode('utf-8', errors='replace')
    if out:
        print(out)
    if err:
        print(err)
c.close()
print('Done.')
