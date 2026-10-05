import io, re, sys
sys.stdout.reconfigure(encoding='utf-8')
p = r'C:\Users\user\AI\projects\halalgames\index.html'
s = io.open(p, encoding='utf-8').read()
i = s.index('<head>')
j = s.index('</head>')
head = s[i:j]

print('literal backtick-n count:', head.count('`n'))
print('literal backslash-n count:', head.count('\\n'))
print('--- BEFORE ---')
print(head[:1400])

# A previous edit wrote PowerShell/JS escape sequences as LITERAL text
# instead of newlines, so the page renders "`n" and "\n" as visible
# characters above the fold. Restore them to real line breaks.
head2 = head.replace('`n', '\n').replace('\\n', '\n')
# collapse any blank-line pile-up created by the fix
head2 = re.sub(r'\n{3,}', '\n\n', head2)

# canonical + og tags were never present
if 'rel="canonical"' not in head2:
    add = (
        '<link rel="canonical" href="https://halalgames.mscarabia.com/">\n'
        '<meta property="og:type" content="website">\n'
        '<meta property="og:url" content="https://halalgames.mscarabia.com/">\n'
        '<meta property="og:title" content="HalalGames \u2014 Know why before you play">\n'
        '<meta property="og:description" content="Search any video game for its Islamic content rating. Understand why a game is halal, caution, or best avoided.">\n'
        '<meta property="og:image" content="https://halalgames.mscarabia.com/assets/og-image.png">\n'
        '<meta name="twitter:card" content="summary_large_image">\n'
    )
    head2 = head2.replace('<title>', add + '<title>', 1)
    print('\nadded canonical + Open Graph / Twitter tags')

s = s[:i] + head2 + s[j:]
io.open(p, 'w', encoding='utf-8', newline='').write(s)
print('\n--- AFTER ---')
print(io.open(p, encoding='utf-8').read()[i:i + 1500])
