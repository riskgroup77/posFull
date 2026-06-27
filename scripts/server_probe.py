import paramiko

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('5.199.162.5', username='root', password='f3qdYvac58Mhqfn', timeout=30)

cmds = [
    'uname -a',
    'docker --version 2>/dev/null || echo no-docker',
    'docker compose version 2>/dev/null || docker-compose --version 2>/dev/null || echo no-compose',
    'nginx -v 2>&1',
    'ls -la /etc/nginx/sites-enabled/ 2>/dev/null || ls -la /etc/nginx/conf.d/',
    'ls -la /var/www/ 2>/dev/null | head -20',
    'ss -tlnp | head -25',
    'which git certbot python3 node npm 2>/dev/null',
]

for cmd in cmds:
    stdin, stdout, stderr = c.exec_command(cmd)
    out = stdout.read().decode(errors='replace').strip()
    err = stderr.read().decode(errors='replace').strip()
    print('===', cmd, '===')
    print(out or err)
    print()

c.close()
