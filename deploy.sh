#!/bin/bash
# ==============================================
# Git 版本管理工具
# ==============================================

VERSION_FILE="VERSION"
LOG_FILE="version_log.txt"

# ===== 取得目前版本 =====
get_version() {
    if [[ ! -f "$VERSION_FILE" ]]; then
        echo "0.0.1" > "$VERSION_FILE"
    fi
    cat "$VERSION_FILE"
}

# ===== 版本號 +1 =====
increment_version() {
    old_version=$(get_version)
    IFS='.' read -r major minor patch <<< "$old_version"
    patch=$((patch + 1))
    new_version="$major.$minor.$patch"
    echo "$new_version" > "$VERSION_FILE"
    echo "$new_version"
}

# ===== 新版本紀錄 =====
write_log() {
    version=$1
    message=$2
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] - $message" >> "$LOG_FILE"
}

# ===== 主流程 =====
if [[ -z "$1" ]]; then
    echo "⚠ 使用方式："
    echo "./deploy.sh \"你的更新說明\""
    exit 1
fi

MESSAGE=$1

# 加入所有變更
git add .

# 建立新版本號
NEW_VERSION=$(increment_version)

# commit
git commit -m "$MESSAGE"

# push
git push

# 寫入 log
write_log "$MESSAGE"

echo "======================================"
echo "更新成功"
echo "======================================"
