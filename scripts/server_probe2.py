import paramiko

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('5.199.162.5', username='root', password='f3qdYvac58Mhqfn', timeout=30)

cmds = [
    'cat /etc/nginx/sites-available/energohealth-predict.uz 2>/dev/null | head -40',
    'ls -la /etc/letsencrypt/live/ 2>/dev/null',
    'host pos.devflix.uz 2>/dev/null || dig +short pos.devflix.uz',
    'host posapi.devflix.uz 2>/dev/null || dig +short posapi.devflix.uz',
    'docker ps --format "table {{.Names}}\t{{.Ports}}" | head -20',
]

for cmd in cmds:
    stdin, stdout, stderr = c.exec_command(cmd)
    out = stdout.read().decode(errors='replace').strip()
    err = stderr.read().decode(errors='replace').strip()
    print('===', cmd, '===')
    print(out or err)
    print()

c.close()
