#!/bin/sh
# 로컬 git 훅 설치: 스테이징된 변경, 작성자 정보, 커밋 메시지, push할 전체 파일을 .git/info/wordguard(원격에 올라가지 않음)의 패턴으로 검사한다.
# 패턴 파일은 한 줄에 정규식 하나(대소문자 무시), #으로 시작하는 줄은 주석.
set -e
root=$(git rev-parse --show-toplevel)
hooks="$root/.git/hooks"
guard="$root/.git/info/wordguard"
[ -f "$guard" ] || { mkdir -p "$root/.git/info"; printf '# 한 줄에 정규식 하나. 이 파일은 원격에 올라가지 않는다.\n' > "$guard"; echo "빈 금지어 목록을 만들었습니다: $guard"; }

cat > "$hooks/pre-commit" <<'HOOK'
#!/bin/sh
guard="$(git rev-parse --git-dir)/info/wordguard"
[ -f "$guard" ] || exit 0
pat=$(grep -v '^\s*#' "$guard" | grep -v '^\s*$' | paste -sd'|' -)
[ -n "$pat" ] || exit 0
hits=$(git diff --cached -U0 --no-color | grep '^+' | grep -v '^+++' | grep -inE "$pat" || true)
names=$(git diff --cached --name-only | grep -iE "$pat" || true)
if [ -n "$hits$names" ]; then
  echo "커밋 중단: 이 repo에 쓰면 안 되는 표현이 있습니다 (.git/info/wordguard)."
  [ -n "$hits" ] && echo "$hits" | head -20
  [ -n "$names" ] && echo "파일 이름: $names"
  exit 1
fi
if { git var GIT_AUTHOR_IDENT; git var GIT_COMMITTER_IDENT; } | grep -iqE "$pat"; then
  echo "커밋 중단: 작성자 이름·이메일에 쓰면 안 되는 표현이 있습니다. 이 repo의 git config user.email을 바꾸세요."
  exit 1
fi
HOOK

cat > "$hooks/commit-msg" <<'HOOK'
#!/bin/sh
guard="$(git rev-parse --git-dir)/info/wordguard"
[ -f "$guard" ] || exit 0
pat=$(grep -v '^\s*#' "$guard" | grep -v '^\s*$' | paste -sd'|' -)
[ -n "$pat" ] || exit 0
if grep -v '^#' "$1" | grep -iqE "$pat"; then
  echo "커밋 중단: 커밋 메시지에 이 repo에 쓰면 안 되는 표현이 있습니다 (.git/info/wordguard)."
  exit 1
fi
HOOK
cat > "$hooks/pre-push" <<'HOOK'
#!/bin/sh
guard="$(git rev-parse --git-dir)/info/wordguard"
[ -f "$guard" ] || exit 0
pat=$(grep -v '^\s*#' "$guard" | grep -v '^\s*$' | paste -sd'|' -)
[ -n "$pat" ] || exit 0
zero=0000000000000000000000000000000000000000
fail=0
while read -r lref lsha rref rsha; do
  [ "$lsha" = "$zero" ] && continue
  if git grep -I -i -n -E "$pat" "$lsha" -- . >/dev/null 2>&1; then
    echo "push 중단: 올라갈 파일에 이 repo에 쓰면 안 되는 표현이 있습니다."
    git grep -I -i -n -E "$pat" "$lsha" -- . | head -20
    fail=1
  fi
  commits=$(git rev-list "$lsha" --not --remotes)
  [ -n "$commits" ] || continue
  if git log --no-walk --format='%an %ae %cn %ce%n%B' $commits | grep -iqE "$pat"; then
    echo "push 중단: 올라갈 커밋의 작성자 정보나 메시지에 쓰면 안 되는 표현이 있습니다."
    fail=1
  fi
done
exit $fail
HOOK
chmod +x "$hooks/pre-commit" "$hooks/commit-msg" "$hooks/pre-push"
echo "훅 설치 완료: pre-commit, commit-msg, pre-push"
