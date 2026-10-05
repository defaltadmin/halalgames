import io, sys
sys.stdout.reconfigure(encoding='utf-8')
p = r'C:\Users\user\AI\projects\halalgames\index.html'
s = io.open(p, encoding='utf-8').read()
# There is no og-image asset in this repo. Pointing og:image at a file that
# does not exist is exactly the bug that was already fixed on maazaia.com:
# every social share renders with no preview image. Omit the tags rather
# than reference a missing file.
for line in [
    '<meta property="og:image" content="https://halalgames.mscarabia.com/assets/og-image.png">\n',
    '<meta name="twitter:card" content="summary_large_image">\n',
]:
    s = s.replace(line, '')
# twitter:card with no image is fine, but keep it consistent: drop it entirely.
io.open(p, 'w', encoding='utf-8', newline='').write(s)
print(s[s.index('<head>'):s.index('</head>')])
