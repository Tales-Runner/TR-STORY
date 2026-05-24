import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "개인정보 처리 안내",
  description:
    "TR Story 는 사용자 계정 · 분석 · 쿠키 · 서버 로그 없이 동작합니다. 읽음 표시 · 즐겨찾기 · 진행률은 모두 사용자 브라우저에만 저장되며 외부로 전송되지 않습니다.",
  alternates: { canonical: "/privacy/" },
  openGraph: {
    title: "개인정보 처리 안내 — TR Story",
    description:
      "TR Story 의 데이터 흐름과 사용자 정보 보호 정책을 간단히 정리한 안내문.",
    url: "/privacy/",
  },
};

export default function PrivacyPage() {
  return (
    <div className="mx-auto w-full max-w-[720px] px-4 pt-6 pb-24">
      <header className="mb-6">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-xs text-[var(--color-text-soft)] hover:text-[var(--color-brand)]"
        >
          ← 홈으로
        </Link>
        <h1 className="mt-3 text-2xl font-bold text-[var(--color-text)]">
          개인정보 처리 안내
        </h1>
        <p className="mt-1 text-xs text-[var(--color-text-muted)]">
          최종 업데이트: 2026-05-25
        </p>
      </header>

      <section className="space-y-2 mb-8">
        <h2 className="text-base font-bold text-[var(--color-text)]">
          요약 한 줄
        </h2>
        <p className="text-sm leading-relaxed text-[var(--color-text-soft)]">
          TR Story 는{" "}
          <span className="font-bold text-[var(--color-text)]">
            계정 · 분석 도구 · 쿠키 · 서버 측 사용자 로그가 없는
          </span>{" "}
          정적 사이트입니다. 사용자가 표시한 읽음 · 즐겨찾기 · 진행률은 모두
          본인의 브라우저 안 에만 저장되며 외부 서버로 전송되지 않습니다.
        </p>
      </section>

      <Section title="1. 사이트 성격">
        <P>
          TR Story 는 테일즈런너(테런) 공식 라이브러리의 웹툰·영상을 모바일
          가독성을 위해 별도로 정리한{" "}
          <Strong>비공식 미러</Strong> 입니다. 운영자 개인 프로젝트로 광고·
          수익화·구독 모델이 없으며 사용자에게 어떠한 회원가입도 요청하지
          않습니다.
        </P>
      </Section>

      <Section title="2. 우리가 저장하는 데이터 (전부 사용자 기기 안)">
        <P>
          다음 항목은 사용자 브라우저의 IndexedDB 또는 localStorage 에만
          저장되며 외부로 전송되지 않습니다.
        </P>
        <Bullet>
          <B>읽음 표시</B> · 회차 ID 와 표시 시각만 (브라우저 IndexedDB
          {" "}<Code>tr-story</Code> DB).
        </Bullet>
        <Bullet>
          <B>즐겨찾기</B> · 회차 ID 와 즐겨찾기 추가 시각만.
        </Bullet>
        <Bullet>
          <B>읽기 진행률</B> · 회차별 0~100% 스크롤 위치.
        </Bullet>
        <Bullet>
          <B>첫 방문 안내 닫음 여부</B> · localStorage 의 단일 boolean
          플래그.
        </Bullet>
        <P className="mt-3">
          위 데이터는 사용자가 브라우저 설정에서 사이트 데이터를 삭제하면
          영구히 사라집니다. 운영자는 이를 다시 복구할 수 없습니다.
        </P>
      </Section>

      <Section title="3. 우리가 수집·전송하지 않는 것">
        <Bullet>
          <B>계정 · 비밀번호 · 이메일</B> — 로그인 기능 자체가 없습니다.
        </Bullet>
        <Bullet>
          <B>분석 도구</B> — Google Analytics, Vercel Analytics, Plausible,
          Mixpanel 등 어떠한 분석 스크립트도 삽입되어 있지 않습니다.
        </Bullet>
        <Bullet>
          <B>광고 추적기 · 픽셀</B> — 광고 자체가 없습니다.
        </Bullet>
        <Bullet>
          <B>쿠키</B> — 사이트가 직접 쿠키를 설정하지 않습니다. (브라우저가
          제3자 도메인에 보내는 일반 fetch 요청은 별도)
        </Bullet>
        <Bullet>
          <B>서버 측 사용자 행동 로그</B> — 사이트는 GitHub Pages 의 정적
          파일로만 구성되어 별도 application 서버가 없습니다.
        </Bullet>
      </Section>

      <Section title="4. 제3자 서비스">
        <P>
          사이트는 다음 외부 도메인의 콘텐츠를 사용자 브라우저로 직접 불러
          옵니다. 이 과정에서 사용자의 IP, User-Agent 등 일반적인 HTTP 요청
          정보가 해당 제3자 서버에 도달할 수 있으며, 그 부분은 각 서비스의
          정책을 따릅니다.
        </P>
        <Bullet>
          <B>GitHub Pages</B> (호스팅, github.com) — HTML/CSS/JS 정적 파일
          서빙.
        </Bullet>
        <Bullet>
          <B>trimage.rhaon.co.kr</B> (이미지 호스트) — 웹툰 패널 이미지.
          공식 라이브러리의 원본 이미지를 그대로 직접 링크합니다.
        </Bullet>
        <Bullet>
          <B>cdn.jsdelivr.net</B> — Pretendard 폰트 파일.
        </Bullet>
        <Bullet>
          <B>tr.game.onstove.com</B> — 회차 페이지의 &ldquo;공식 댓글&rdquo;
          버튼을 누른 경우에만 새 탭으로 이동.
        </Bullet>
      </Section>

      <Section title="5. 사용자 데이터 통제권">
        <Bullet>
          <B>전체 삭제</B>: 브라우저의 설정 → 개인정보 · 사이트 데이터 →
          tales-runner.github.io 항목 삭제. IndexedDB · localStorage 가 함께
          비워집니다.
        </Bullet>
        <Bullet>
          <B>읽음/즐겨찾기 개별 해제</B>: 카드 또는 뷰어의 ✓ · ★ 버튼을 다시
          눌러 해제 가능.
        </Bullet>
      </Section>

      <Section title="6. 콘텐츠 저작권 · 권리자 요청">
        <P>
          모든 웹툰·영상 콘텐츠의 권리는 RHAON Entertainment 및 Blomics 에
          있습니다. TR Story 는 모바일 가독성 향상을 목적으로 한 비공식
          미러이며, 원본 권리자가 콘텐츠 제거를 요청하시는 경우{" "}
          <A href="https://github.com/Tales-Runner/TR-STORY/issues">
            저장소 issue
          </A>
          를 통해 알려주시면 신속히 제거하겠습니다.
        </P>
      </Section>

      <Section title="7. 변경 안내">
        <P>
          본 안내문이 변경될 경우 동일 페이지의 &ldquo;최종 업데이트&rdquo;
          날짜가 갱신됩니다. 데이터 수집 정책이 의미 있게 바뀌는 경우(예: 분석
          도구 도입) 별도 공지 페이지로 미리 알리겠습니다.
        </P>
      </Section>

      <footer className="mt-12 border-t border-[var(--color-border)] pt-6 text-xs text-[var(--color-text-muted)]">
        TR Story 는 비공식 미러로, 모든 콘텐츠 권리는 RHAON Entertainment 및
        Blomics 에 있습니다. 공식 페이지:{" "}
        <a
          href="https://tr.game.onstove.com/archive/trstory"
          target="_blank"
          rel="noreferrer noopener"
          className="underline"
        >
          tr.game.onstove.com/archive/trstory
        </a>
      </footer>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-8 space-y-2">
      <h2 className="text-base font-bold text-[var(--color-text)]">{title}</h2>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

function P({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <p
      className={`text-sm leading-relaxed text-[var(--color-text-soft)] ${className ?? ""}`}
    >
      {children}
    </p>
  );
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-2 text-sm leading-relaxed text-[var(--color-text-soft)]">
      <span className="mt-1.5 inline-block w-1 h-1 rounded-full bg-[var(--color-text-muted)] shrink-0" />
      <span className="flex-1">{children}</span>
    </div>
  );
}

function B({ children }: { children: React.ReactNode }) {
  return <span className="font-bold text-[var(--color-text)]">{children}</span>;
}

function Strong({ children }: { children: React.ReactNode }) {
  return (
    <span className="font-bold text-[var(--color-brand-strong)]">
      {children}
    </span>
  );
}

function Code({ children }: { children: React.ReactNode }) {
  return (
    <code className="rounded bg-[var(--color-surface-alt)] px-1.5 py-0.5 text-[12px] font-mono text-[var(--color-text)]">
      {children}
    </code>
  );
}

function A({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer noopener"
      className="underline text-[var(--color-brand-strong)] hover:text-[var(--color-brand)]"
    >
      {children}
    </a>
  );
}
