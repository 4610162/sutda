import subprocess
import sys

def run_command(command):
    """터미널 명령어를 실행하고 에러가 발생하면 종료합니다."""
    try:
        print(f"🚀 실행 중: {command}")
        subprocess.run(command, shell=True, check=True)
    except subprocess.CalledProcessError as e:
        print(f"❌ 에러 발생: {e}")
        sys.exit(1)

def main():
    # 1. 커밋 메시지 확인
    if len(sys.argv) < 2:
        commit_message = input("커밋 메시지를 입력하세요: ")
    else:
        commit_message = sys.argv[1]

    if not commit_message:
        print("⚠️ 커밋 메시지가 없어 작업을 중단합니다.")
        return

    # 2. 순차적 명령어 실행
    commands = [
        "npx convex deploy",
        "git add .",
        f'git commit -m "{commit_message}"',
        "git push origin main"
    ]

    for cmd in commands:
        run_command(cmd)

    print("\n✅ 모든 작업이 완료되었습니다!")

if __name__ == "__main__":
    main()