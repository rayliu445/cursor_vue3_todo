#!/usr/bin/env python3
"""
Fix Kotlin duplicate class conflict in Capacitor-generated Android build.gradle.
Inserts a 'configurations { all { exclude } }' block before 'android {' block
to prevent kotlin-stdlib-jdk7/jdk8 duplicates with kotlin-stdlib.
"""
import sys

path = 'android/app/build.gradle'
if len(sys.argv) > 1:
    path = sys.argv[1]

with open(path) as f:
    content = f.read()

if 'configurations {' in content:
    print('Kotlin fix already present, skipping')
    sys.exit(0)

block = """configurations {
    all {
        exclude group: "org.jetbrains.kotlin", module: "kotlin-stdlib-jdk7"
        exclude group: "org.jetbrains.kotlin", module: "kotlin-stdlib-jdk8"
    }
}

"""

content = content.replace('android {', block + 'android {')

with open(path, 'w') as f:
    f.write(content)

print('Kotlin fix applied successfully')
