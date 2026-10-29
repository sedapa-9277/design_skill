// 설정 → 축구 상식 퀴즈 문제 (경기 규칙 위주). 한국어 QUIZ_KO, 영어 QUIZ_EN (같은 순서).
// 참고: 위키백과 「축구 경기 규칙」(IFAB 경기 규칙 요약). 그 뒤 바뀐 규칙은 현재 규칙으로 쓰고 해설에 적었다.
// q: 문제, c: 보기 4개, a: 정답 번호(0부터), e: 해설
window.QUIZ_KO = [
  // ---- 규칙 일반 ----
  { q: "축구 경기 규칙을 정하고 고치는 국제 기구는?", c: ["국제축구평의회(IFAB)", "아시아축구연맹(AFC)", "유럽축구연맹(UEFA)", "국제올림픽위원회(IOC)"], a: 0,
    e: "경기 규칙은 국제축구평의회(IFAB)가 정합니다. FIFA도 IFAB의 구성원입니다." },
  { q: "축구 경기 규칙은 모두 몇 개 조항으로 되어 있을까요?", c: ["11개", "15개", "17개", "21개"], a: 2,
    e: "경기장(1조)부터 코너킥(17조)까지 17개 조항입니다." },
  { q: "VAR은 무엇의 줄임말일까요?", c: ["Video Assistant Referee", "Visual Area Review", "Video Action Replay", "Valid Attack Rule"], a: 0,
    e: "VAR은 비디오 판독 심판(Video Assistant Referee)입니다." },

  // ---- 1조 경기장 ----
  { q: "센터서클의 반지름은?", c: ["5.5m", "9.15m", "11m", "16.5m"], a: 1,
    e: "센터서클 반지름은 9.15m(10야드)입니다. 프리킥·코너킥 때 상대가 떨어져야 하는 거리와 같습니다." },
  { q: "페널티 마크는 골라인 가운데에서 몇 m 떨어져 있을까요?", c: ["9.15m", "10m", "11m", "12m"], a: 2,
    e: "페널티 마크는 골포스트 사이 중간점에서 11m(12야드) 지점입니다." },
  { q: "페널티 에어리어는 골포스트 안쪽에서 몇 m 지점부터 그릴까요?", c: ["5.5m", "9.15m", "11m", "16.5m"], a: 3,
    e: "골포스트 안쪽 16.5m 지점에서 경기장 안쪽으로 16.5m를 그어 페널티 에어리어를 만듭니다." },
  { q: "골 에어리어(골대 앞 작은 박스)의 크기 기준은?", c: ["3m", "5.5m", "7.32m", "9.15m"], a: 1,
    e: "골포스트 안쪽 5.5m 지점에서 경기장 안쪽으로 5.5m를 그어 만듭니다." },
  { q: "코너 아크(코너의 4분의 1 원)의 반지름은?", c: ["50cm", "1m", "2m", "3m"], a: 1,
    e: "코너 아크의 반지름은 1m입니다. 코너킥 때 공을 이 안에 둡니다." },
  { q: "국제 경기에서 터치라인(긴 쪽)의 길이는?", c: ["90~100m", "100~110m", "110~120m", "120~130m"], a: 1,
    e: "국제 경기 터치라인은 100~110m, 골라인은 64~75m입니다. 일반 경기는 90~120m까지 됩니다." },
  { q: "국제 경기에서 골라인(짧은 쪽)의 길이는?", c: ["45~60m", "64~75m", "75~90m", "90~100m"], a: 1,
    e: "국제 경기 골라인은 64~75m입니다." },
  { q: "경기장 선의 너비는 최대 얼마까지 될까요?", c: ["5cm", "8cm", "12cm", "20cm"], a: 2,
    e: "모든 선의 너비는 같아야 하고 12cm를 넘을 수 없습니다. 선은 그 선이 둘러싼 구역에 포함됩니다." },
  { q: "페널티 아크(페널티 에어리어 밖 반원)는 왜 그릴까요?", c: ["골키퍼가 나올 수 있는 한계", "페널티킥 때 선수들이 페널티 마크에서 9.15m 떨어지게 하려고", "코너킥 키커의 위치", "교체 선수 대기 구역"], a: 1,
    e: "페널티킥 때 키커 외 선수는 페널티 마크에서 9.15m 이상 떨어져야 해서, 그 거리를 원호로 표시합니다." },

  // ---- 2조 공 ----
  { q: "정식 경기 공(5호)의 둘레는?", c: ["58~60cm", "63~65cm", "68~70cm", "73~75cm"], a: 2,
    e: "공의 둘레는 68~70cm입니다." },
  { q: "정식 경기 공의 무게는 경기 시작 때 얼마일까요?", c: ["310~350g", "360~400g", "410~450g", "460~500g"], a: 2,
    e: "경기 시작 때 공 무게는 410~450g입니다." },
  { q: "경기 중 공이 터지거나 망가지면 어떻게 할까요?", c: ["그 상태로 계속한다", "경기를 멈추고 드롭볼로 다시 시작한다", "공을 가진 팀의 프리킥", "그 경기를 처음부터 다시 한다"], a: 1,
    e: "경기를 멈추고 새 공으로 드롭볼해서 다시 시작합니다. 킥오프·페널티킥 등을 차는 중이었다면 그 킥을 다시 합니다." },

  // ---- 3조 선수 ----
  { q: "한 팀이 경기장에 내보낼 수 있는 최대 선수 수는? (골키퍼 포함)", c: ["10명", "11명", "12명", "13명"], a: 1,
    e: "한 팀은 골키퍼 1명을 포함해 최대 11명입니다." },
  { q: "한 팀 선수가 몇 명 미만이면 경기를 시작하거나 계속할 수 없을까요?", c: ["5명", "6명", "7명", "8명"], a: 2,
    e: "어느 팀이든 7명 미만이면 경기를 시작하거나 계속할 수 없습니다." },
  { q: "요즘 프로 대회에서 한 경기에 쓸 수 있는 교체 인원은 보통 최대 몇 명일까요?", c: ["3명", "4명", "5명", "제한 없음"], a: 2,
    e: "2022년부터 최대 5명 교체가 정식 규칙이 되었습니다(하프타임 외 교체 기회는 3번). 문서의 예전 기준은 3명이었습니다." },
  { q: "교체 선수는 언제 경기장에 들어갈 수 있을까요?", c: ["아무 때나 바로", "경기가 멈췄을 때 주심 신호를 받고", "골이 들어간 뒤에만", "하프타임에만"], a: 1,
    e: "경기가 멈췄을 때, 나가는 선수가 나간 뒤 주심 신호를 받고 하프웨이 라인 근처로 들어갑니다." },
  { q: "주장에게 주어지는 특별한 권한은?", c: ["판정에 이의를 제기할 권한", "교체를 결정할 권한", "특별한 권한은 없다", "프리킥을 차는 권한"], a: 2,
    e: "주장은 특별한 지위나 권한이 없고, 팀의 행동에 어느 정도 책임을 질 뿐입니다." },

  // ---- 4조 장비 ----
  { q: "다음 중 선수가 꼭 갖춰야 하는 필수 장비가 아닌 것은?", c: ["정강이 보호대", "양말", "장갑", "신발"], a: 2,
    e: "필수 장비는 소매 있는 셔츠, 반바지, 양말, 정강이 보호대, 신발입니다. 장갑은 필수가 아닙니다." },
  { q: "목걸이나 반지를 테이프로 감싸면 차고 뛸 수 있을까요?", c: ["가능하다", "주심이 허락하면 가능하다", "골키퍼만 가능하다", "불가능하다"], a: 3,
    e: "모든 장신구는 금지이며, 테이프로 가리는 것도 허용되지 않습니다." },
  { q: "골키퍼 유니폼 색에 대한 규칙은?", c: ["같은 팀 선수와 같아야 한다", "다른 선수들과 심판 모두와 구별되어야 한다", "검은색이어야 한다", "제한이 없다"], a: 1,
    e: "골키퍼는 양 팀 선수와 심판 모두와 구별되는 색을 입어야 합니다." },

  // ---- 5·6조 심판 ----
  { q: "주심이 판정을 바꿀 수 있는 시점은?", c: ["언제든지", "경기를 다시 시작하기 전까지", "하프타임까지", "경기가 끝난 뒤"], a: 1,
    e: "주심은 경기를 재개하기 전(또는 경기 종료 전)까지만 판정을 바꿀 수 있습니다." },
  { q: "어드밴티지를 줬는데 기대한 이득이 생기지 않으면?", c: ["그대로 경기를 계속한다", "처음 반칙을 처벌한다", "드롭볼로 다시 시작한다", "양 팀 모두에게 경고한다"], a: 1,
    e: "어드밴티지 이득이 곧바로 생기지 않으면 처음 반칙을 처벌합니다." },
  { q: "부심(선심)은 보통 몇 명일까요?", c: ["1명", "2명", "3명", "4명"], a: 1,
    e: "부심은 2명이며, 공 아웃, 오프사이드, 교체 요청 등을 알립니다. 교체 관리를 돕는 대기심(제4심판)은 따로 있습니다." },

  // ---- 7조 경기 시간 ----
  { q: "정규 경기 시간은?", c: ["전·후반 40분씩 80분", "전·후반 45분씩 90분", "전·후반 50분씩 100분", "4쿼터 20분씩 80분"], a: 1,
    e: "전반 45분, 후반 45분으로 모두 90분입니다." },
  { q: "하프타임 휴식은 최대 몇 분까지일까요?", c: ["10분", "15분", "20분", "30분"], a: 1,
    e: "하프타임은 15분을 넘을 수 없습니다." },
  { q: "전반 종료 직전에 페널티킥이 선언되면?", c: ["후반 시작 때 찬다", "차지 않고 전반을 끝낸다", "시간을 늘려서 찬다", "간접 프리킥으로 바꾼다"], a: 2,
    e: "전·후반이나 연장전 끝나기 직전에 선언된 페널티킥은 시간을 늘려서 찹니다." },

  // ---- 8조 시작과 재개 ----
  { q: "킥오프 때 상대 선수는 공에서 얼마나 떨어져야 할까요?", c: ["5.5m", "9.15m", "11m", "제한 없음"], a: 1,
    e: "킥오프 때 상대 선수는 공에서 9.15m 이상(센터서클 밖) 떨어져야 합니다." },
  { q: "킥오프에서 공을 바로 차서 상대 골에 넣으면?", c: ["득점 인정", "다시 킥오프", "상대 골킥", "간접 프리킥"], a: 0,
    e: "킥오프에서 상대 골에 바로 들어가면 득점으로 인정됩니다." },
  { q: "킥오프 때 공을 뒤쪽(자기 진영)으로 차도 될까요?", c: ["안 된다, 반드시 앞으로", "된다", "골키퍼에게만 된다", "후반에만 된다"], a: 1,
    e: "2016년부터 킥오프는 어느 방향으로 차도 됩니다. 공이 차여서 분명히 움직이면 인플레이입니다." },
  { q: "킥오프한 선수가 다른 선수가 닿기 전에 공을 다시 차면?", c: ["상관없다", "상대의 간접 프리킥", "상대의 페널티킥", "다시 킥오프"], a: 1,
    e: "키커는 다른 선수가 닿기 전에 공을 두 번 건드릴 수 없습니다. 위반하면 상대의 간접 프리킥입니다." },

  // ---- 9·10조 인/아웃, 득점 ----
  { q: "공이 언제 '아웃'일까요?", c: ["공의 일부가 선을 넘었을 때", "공 전체가 선을 완전히 넘었을 때", "공이 선에 닿았을 때", "공이 선 위에서 멈췄을 때"], a: 1,
    e: "공 전체가 터치라인이나 골라인을 완전히 넘어야 아웃입니다. 선에 조금이라도 걸쳐 있으면 인플레이입니다." },
  { q: "골이 인정되려면 공이 어떻게 되어야 할까요?", c: ["공의 절반이 골라인을 넘으면", "공이 골라인에 닿으면", "공 전체가 골포스트 사이, 크로스바 아래로 골라인을 완전히 넘으면", "골키퍼 손에 닿기 전에 골라인에 닿으면"], a: 2,
    e: "반칙이 없고, 공 전체가 골포스트 사이·크로스바 아래로 골라인을 완전히 넘어야 득점입니다." },
  { q: "슈팅이 골포스트를 맞고 경기장 안으로 튀어나오면?", c: ["인플레이, 경기 계속", "골킥", "드롭볼", "다시 슈팅"], a: 0,
    e: "골포스트, 크로스바, 코너 깃대를 맞고 경기장 안으로 들어오면 인플레이입니다." },
  { q: "승부차기는 기본으로 한 팀에 몇 번씩 찰까요?", c: ["3번", "5번", "7번", "11번"], a: 1,
    e: "양 팀이 5번씩 차고, 그래도 같으면 한 번씩 번갈아 승부가 날 때까지 찹니다." },
  { q: "승부차기에 나설 수 있는 선수는?", c: ["명단에 있는 모든 선수", "경기(연장 포함)가 끝났을 때 경기장에 있던 선수", "교체로 나간 선수 포함 누구나", "주장이 고른 5명만"], a: 1,
    e: "경기가 끝난 순간 경기장에 있던 선수만 찰 수 있습니다." },

  // ---- 11조 오프사이드 ----
  { q: "오프사이드 '위치'에 있기만 해도 반칙일까요?", c: ["반칙이다", "반칙이 아니다", "골키퍼 근처면 반칙이다", "후반에는 반칙이다"], a: 1,
    e: "오프사이드 위치에 있는 것만으로는 반칙이 아닙니다. 동료가 패스할 때 플레이에 관여해야 반칙입니다." },
  { q: "다음 중 오프사이드가 적용되지 않는 것은?", c: ["코너킥을 바로 받을 때", "직접 프리킥을 바로 받을 때", "간접 프리킥을 바로 받을 때", "동료의 패스를 바로 받을 때"], a: 0,
    e: "골킥, 스로인, 코너킥에서 바로 공을 받으면 오프사이드가 아닙니다." },
  { q: "스로인으로 던진 공을 바로 받으면 오프사이드일까요?", c: ["항상 오프사이드", "오프사이드가 아니다", "페널티 에어리어 안이면 오프사이드", "주심 판단"], a: 1,
    e: "스로인에서 바로 받은 공은 오프사이드가 적용되지 않습니다." },
  { q: "오프사이드를 판단할 때 고려하지 않는 신체 부위는?", c: ["머리", "발", "몸통", "손과 팔"], a: 3,
    e: "득점할 수 있는 머리·몸·발만 봅니다. 손과 팔(겨드랑이 아래 선까지)은 고려하지 않습니다." },
  { q: "공격수가 상대 마지막에서 두 번째 수비수와 같은 선에 있으면?", c: ["오프사이드", "오프사이드가 아니다", "간접 프리킥", "부심 판단"], a: 1,
    e: "같은 선상이면 오프사이드 위치가 아닙니다." },
  { q: "자기 진영(하프웨이 라인 포함)에 있는 선수는 오프사이드가 될까요?", c: ["될 수 있다", "되지 않는다", "골키퍼가 나와 있으면 된다", "후반에만 된다"], a: 1,
    e: "오프사이드 위치는 상대 진영에서만 생깁니다. 하프웨이 라인 위는 자기 진영으로 봅니다." },
  { q: "오프사이드 반칙의 처벌은?", c: ["직접 프리킥", "간접 프리킥", "페널티킥", "경고"], a: 1,
    e: "반칙이 일어난 지점에서 상대의 간접 프리킥으로 다시 시작합니다." },

  // ---- 12조 반칙과 징계 ----
  { q: "자기 페널티 에어리어 안에서 상대를 걸어 넘어뜨리면?", c: ["간접 프리킥", "직접 프리킥", "페널티킥", "드롭볼"], a: 2,
    e: "직접 프리킥 반칙을 자기 페널티 에어리어 안에서 하면 상대에게 페널티킥을 줍니다." },
  { q: "동료가 일부러 발로 패스한 공을 골키퍼가 손으로 잡으면?", c: ["문제없다", "상대의 간접 프리킥", "상대의 페널티킥", "골키퍼 경고"], a: 1,
    e: "백패스를 손으로 잡으면 상대의 간접 프리킥입니다. 머리·가슴으로 준 패스는 손으로 잡아도 됩니다." },
  { q: "2025/26 개정 규칙에서, 골키퍼가 손으로 공을 8초 넘게 잡고 있으면?", c: ["경고", "상대의 간접 프리킥", "상대의 코너킥", "상대의 페널티킥"], a: 2,
    e: "예전에는 6초를 넘기면 간접 프리킥이었지만, 2025/26 규칙부터 8초를 넘기면 상대에게 코너킥을 줍니다." },
  { q: "다음 중 경고(옐로카드)가 아니라 바로 퇴장인 행동은?", c: ["판정에 항의", "경기 재개 지연", "상대에게 침 뱉기", "프리킥 거리 안 지키기"], a: 2,
    e: "침 뱉기는 퇴장 사유입니다. 항의, 지연, 거리 미준수는 경고 사유입니다." },
  { q: "한 경기에서 경고를 두 번 받으면?", c: ["벌금만 낸다", "퇴장", "10분간 퇴장", "다음 경기 출전 정지만"], a: 1,
    e: "같은 경기에서 두 번째 경고를 받으면 퇴장(레드카드)입니다." },
  { q: "필드 선수가 골문으로 들어가는 공을 일부러 손으로 막으면?", c: ["경고와 프리킥", "퇴장", "간접 프리킥만", "득점 인정"], a: 1,
    e: "고의 핸드볼로 득점이나 명백한 득점 기회를 막으면 퇴장입니다(자기 페널티 에어리어 안의 골키퍼는 제외)." },

  // ---- 13조 프리킥 ----
  { q: "프리킥 때 상대 선수는 공에서 몇 m 떨어져야 할까요?", c: ["5m", "9.15m", "11m", "16.5m"], a: 1,
    e: "상대는 공에서 9.15m 이상 떨어져야 합니다. 너무 가까우면 다시 찹니다." },
  { q: "간접 프리킥을 차서 상대 골에 바로 들어가면?", c: ["득점", "상대 골킥", "다시 찬다", "상대 코너킥"], a: 1,
    e: "간접 프리킥은 다른 선수에게 닿은 뒤 들어가야 득점입니다. 바로 들어가면 상대 골킥입니다." },
  { q: "직접 프리킥을 찼는데 자기 골에 바로 들어가면?", c: ["자책골", "상대 코너킥", "다시 찬다", "상대 골킥"], a: 1,
    e: "프리킥이 자기 골에 바로 들어가면 득점이 아니고 상대 코너킥입니다." },
  { q: "주심이 간접 프리킥임을 알리는 방법은?", c: ["호루라기 두 번", "한 팔을 머리 위로 든다", "두 팔을 옆으로 벌린다", "노란 깃발을 든다"], a: 1,
    e: "주심은 팔을 머리 위로 들고, 공이 다른 선수에게 닿거나 나갈 때까지 유지합니다." },

  // ---- 14조 페널티킥 ----
  { q: "페널티킥 때 골키퍼는 어디에 있어야 할까요?", c: ["골 에어리어 안 어디든", "골포스트 사이 골라인 위", "페널티 마크 앞 1m", "골대 뒤"], a: 1,
    e: "골키퍼는 공이 차일 때까지 골포스트 사이 골라인 위에 있어야 합니다(적어도 한 발은 골라인에 닿거나 그 위에)." },
  { q: "페널티킥에서 키커 외 다른 선수들의 위치는?", c: ["페널티 에어리어 안 어디든", "페널티 에어리어 밖, 페널티 마크보다 뒤, 9.15m 이상", "센터서클 안", "골라인 뒤"], a: 1,
    e: "키커와 골키퍼 외 선수는 페널티 에어리어 밖, 페널티 마크보다 뒤쪽, 마크에서 9.15m 이상 떨어져야 합니다." },
  { q: "페널티킥이 골포스트를 맞고 나왔을 때 키커가 바로 다시 차서 넣으면?", c: ["득점", "상대의 간접 프리킥", "다시 페널티킥", "골킥"], a: 1,
    e: "키커는 다른 선수가 닿기 전에 공을 두 번 건드릴 수 없습니다. 상대의 간접 프리킥입니다." },

  // ---- 15·16·17조 스로인, 골킥, 코너킥 ----
  { q: "스로인을 직접 상대 골에 던져 넣으면?", c: ["득점", "상대 골킥", "다시 스로인", "상대 코너킥"], a: 1,
    e: "스로인으로는 직접 득점할 수 없습니다. 상대 골에 바로 들어가면 상대 골킥입니다." },
  { q: "올바른 스로인 방법은?", c: ["한 손으로 던진다", "두 손으로 머리 뒤에서 머리 위로 던진다", "발로 찬다", "한 발을 경기장 안에 넣고 던진다"], a: 1,
    e: "경기장을 보고, 두 발을 터치라인 위나 밖 땅에 둔 채 두 손으로 머리 뒤에서 머리 위로 던집니다." },
  { q: "골킥 때 상대 선수는 어디에 있어야 할까요?", c: ["골 에어리어 밖", "공이 인플레이될 때까지 페널티 에어리어 밖", "센터서클 안", "제한 없음"], a: 1,
    e: "골킥 때 상대는 공이 인플레이될 때까지 페널티 에어리어 밖에 있어야 합니다." },
  { q: "골킥으로 상대 골에 바로 넣으면?", c: ["득점 인정", "다시 골킥", "상대 코너킥", "간접 프리킥"], a: 0,
    e: "골킥과 코너킥은 상대 골에 바로 들어가면 득점입니다." },
  { q: "코너킥을 찰 때 코너 깃대를 옮겨도 될까요?", c: ["된다", "안 된다", "주심이 허락하면 된다", "왼발잡이만 된다"], a: 1,
    e: "공은 코너 아크 안에 두고, 코너 깃대는 옮길 수 없습니다." },
];

// 영어 문제: 위 한국어 문제와 같은 순서·같은 정답 번호로 옮겼다 (한쪽을 고치면 다른 쪽도 함께 고친다)
window.QUIZ_EN = [
  // ---- General ----
  { q: "Which international body writes and amends the Laws of the Game?", c: ["International Football Association Board (IFAB)", "Asian Football Confederation (AFC)", "UEFA", "International Olympic Committee (IOC)"], a: 0,
    e: "The Laws of the Game are made by the IFAB. FIFA is one of its members." },
  { q: "How many Laws are there in the Laws of the Game?", c: ["11", "15", "17", "21"], a: 2,
    e: "There are 17 Laws, from The Field of Play (Law 1) to The Corner Kick (Law 17)." },
  { q: "What does VAR stand for?", c: ["Video Assistant Referee", "Visual Area Review", "Video Action Replay", "Valid Attack Rule"], a: 0,
    e: "VAR is the Video Assistant Referee." },

  // ---- Law 1: Field of play ----
  { q: "What is the radius of the centre circle?", c: ["5.5 m", "9.15 m", "11 m", "16.5 m"], a: 1,
    e: "The centre circle has a radius of 9.15 m (10 yd), the same distance opponents must keep at free kicks and corners." },
  { q: "How far is the penalty mark from the middle of the goal line?", c: ["9.15 m", "10 m", "11 m", "12 m"], a: 2,
    e: "The penalty mark is 11 m (12 yd) from the midpoint between the goalposts." },
  { q: "The penalty area is drawn from a point how far from the inside of each goalpost?", c: ["5.5 m", "9.15 m", "11 m", "16.5 m"], a: 3,
    e: "Lines are drawn 16.5 m from the inside of each goalpost and 16.5 m into the field." },
  { q: "What distance defines the goal area (the small box in front of goal)?", c: ["3 m", "5.5 m", "7.32 m", "9.15 m"], a: 1,
    e: "Lines are drawn 5.5 m from the inside of each goalpost and 5.5 m into the field." },
  { q: "What is the radius of the corner arc?", c: ["50 cm", "1 m", "2 m", "3 m"], a: 1,
    e: "The corner arc has a radius of 1 m; the ball is placed inside it for a corner kick." },
  { q: "In international matches, how long must the touchlines be?", c: ["90–100 m", "100–110 m", "110–120 m", "120–130 m"], a: 1,
    e: "International touchlines are 100–110 m and goal lines 64–75 m. Other matches allow 90–120 m." },
  { q: "In international matches, how long must the goal lines be?", c: ["45–60 m", "64–75 m", "75–90 m", "90–100 m"], a: 1,
    e: "International goal lines are 64–75 m." },
  { q: "What is the maximum width of the field markings?", c: ["5 cm", "8 cm", "12 cm", "20 cm"], a: 2,
    e: "All lines are the same width, no more than 12 cm, and belong to the areas they enclose." },
  { q: "Why is the penalty arc (the semicircle outside the penalty area) drawn?", c: ["It limits how far the goalkeeper can come out", "So players stay 9.15 m from the penalty mark at a penalty kick", "It marks where corner takers stand", "It is the substitutes' waiting zone"], a: 1,
    e: "At a penalty kick, players other than the kicker must be at least 9.15 m from the penalty mark; the arc shows that distance." },

  // ---- Law 2: The ball ----
  { q: "What is the circumference of a match ball (size 5)?", c: ["58–60 cm", "63–65 cm", "68–70 cm", "73–75 cm"], a: 2,
    e: "The ball's circumference is 68–70 cm." },
  { q: "How much must a match ball weigh at the start of the match?", c: ["310–350 g", "360–400 g", "410–450 g", "460–500 g"], a: 2,
    e: "The ball weighs 410–450 g at the start of the match." },
  { q: "What happens if the ball bursts during play?", c: ["Play continues with it", "Play stops and restarts with a dropped ball", "Free kick to the team in possession", "The match is replayed from the start"], a: 1,
    e: "Play is stopped and restarted with a dropped ball using a new ball. If it happened during a kick-off, penalty and so on, that kick is retaken." },

  // ---- Law 3: Players ----
  { q: "What is the maximum number of players a team can have on the field (including the goalkeeper)?", c: ["10", "11", "12", "13"], a: 1,
    e: "A team has at most 11 players, one of whom is the goalkeeper." },
  { q: "A match may not start or continue if a team has fewer than how many players?", c: ["5", "6", "7", "8"], a: 2,
    e: "A match cannot start or continue if either team has fewer than 7 players." },
  { q: "In most professional competitions today, how many substitutes can a team use in a match?", c: ["3", "4", "5", "Unlimited"], a: 2,
    e: "Up to 5 substitutes became a permanent Law in 2022 (with 3 opportunities plus half-time). The older source said 3." },
  { q: "When may a substitute enter the field?", c: ["At any time", "During a stoppage, after the referee's signal", "Only after a goal", "Only at half-time"], a: 1,
    e: "During a stoppage, once the replaced player has left, on the referee's signal, near the halfway line." },
  { q: "What special authority does the team captain have?", c: ["To challenge decisions", "To decide substitutions", "None", "To take every free kick"], a: 2,
    e: "The captain has no special status or privileges, only some responsibility for the team's behaviour." },

  // ---- Law 4: Equipment ----
  { q: "Which of these is NOT compulsory equipment for a player?", c: ["Shinguards", "Socks", "Gloves", "Footwear"], a: 2,
    e: "Compulsory equipment is a shirt with sleeves, shorts, socks, shinguards and footwear. Gloves are optional." },
  { q: "Can a player wear a necklace or ring if it is covered with tape?", c: ["Yes", "Yes, if the referee allows it", "Only the goalkeeper", "No"], a: 3,
    e: "All jewellery is forbidden, and taping it over is not allowed." },
  { q: "What is the rule for the goalkeeper's kit colour?", c: ["It must match the outfield players", "It must differ from all other players and the match officials", "It must be black", "There is no rule"], a: 1,
    e: "Each goalkeeper must wear colours that distinguish them from the other players and the officials." },

  // ---- Laws 5–6: Referees ----
  { q: "Until when can the referee change a decision?", c: ["At any time", "Until play restarts", "Until half-time", "After the match"], a: 1,
    e: "The referee may change a decision only before play restarts (or before the match ends)." },
  { q: "The referee plays advantage, but the expected advantage does not happen. What now?", c: ["Play simply continues", "The original offence is penalised", "Restart with a dropped ball", "Both teams are cautioned"], a: 1,
    e: "If the advantage does not follow quickly, the original offence is penalised." },
  { q: "How many assistant referees are there normally?", c: ["1", "2", "3", "4"], a: 1,
    e: "There are 2 assistant referees, who signal the ball out of play, offside and substitutions. The fourth official is separate." },

  // ---- Law 7: Duration ----
  { q: "How long is a regular match?", c: ["Two halves of 40 min (80)", "Two halves of 45 min (90)", "Two halves of 50 min (100)", "Four quarters of 20 min (80)"], a: 1,
    e: "Two halves of 45 minutes, 90 minutes in total." },
  { q: "How long may the half-time interval last at most?", c: ["10 min", "15 min", "20 min", "30 min"], a: 1,
    e: "Half-time must not exceed 15 minutes." },
  { q: "A penalty is awarded just as the first half ends. What happens?", c: ["It is taken at the start of the second half", "It is not taken", "Time is extended so it can be taken", "It becomes an indirect free kick"], a: 2,
    e: "Time is extended for a penalty awarded at the end of either half or of extra time." },

  // ---- Law 8: Start and restart ----
  { q: "At a kick-off, how far must opponents be from the ball?", c: ["5.5 m", "9.15 m", "11 m", "No limit"], a: 1,
    e: "Opponents must be at least 9.15 m from the ball (outside the centre circle)." },
  { q: "A kick-off goes straight into the opponents' goal. What is the decision?", c: ["Goal", "Retake the kick-off", "Goal kick", "Indirect free kick"], a: 0,
    e: "A goal may be scored directly against the opponents from a kick-off." },
  { q: "May the ball be kicked backwards at a kick-off?", c: ["No, it must go forward", "Yes", "Only to the goalkeeper", "Only in the second half"], a: 1,
    e: "Since 2016 the kick-off may go in any direction. The ball is in play once it is kicked and clearly moves." },
  { q: "The kick-off taker touches the ball again before another player does. What happens?", c: ["Nothing", "Indirect free kick to the opponents", "Penalty to the opponents", "Retake the kick-off"], a: 1,
    e: "The kicker may not touch the ball twice in a row; the opponents get an indirect free kick." },

  // ---- Laws 9–10: In/out, scoring ----
  { q: "When is the ball out of play?", c: ["When part of it crosses the line", "When the whole ball has wholly crossed the line", "When it touches the line", "When it stops on the line"], a: 1,
    e: "The whole ball must completely cross the touchline or goal line. If any part is on the line, it is in play." },
  { q: "When is a goal scored?", c: ["When half the ball crosses the goal line", "When the ball touches the goal line", "When the whole ball passes over the goal line between the posts and under the bar", "When it reaches the line before the goalkeeper touches it"], a: 2,
    e: "With no offence, the whole ball must pass over the goal line between the posts and under the crossbar." },
  { q: "A shot hits the goalpost and rebounds into the field. What happens?", c: ["Ball in play, play continues", "Goal kick", "Dropped ball", "Shot retaken"], a: 0,
    e: "The ball stays in play if it rebounds off a goalpost, crossbar or corner flagpost and remains on the field." },
  { q: "How many kicks does each team take in a penalty shoot-out at first?", c: ["3", "5", "7", "11"], a: 1,
    e: "Each team takes 5 kicks; if still level, they take one kick each until there is a winner." },
  { q: "Who may take part in a penalty shoot-out?", c: ["Anyone on the team sheet", "Players on the field when the match (incl. extra time) ended", "Anyone, including substituted players", "Only 5 players chosen by the captain"], a: 1,
    e: "Only players on the field of play at the end of the match may take part." },

  // ---- Law 11: Offside ----
  { q: "Is being in an offside position an offence by itself?", c: ["Yes", "No", "Only near the goalkeeper", "Only in the second half"], a: 1,
    e: "It is not an offence to be in an offside position; the player must become involved in play when a teammate plays the ball." },
  { q: "From which restart can a player NOT be offside when receiving the ball directly?", c: ["Corner kick", "Direct free kick", "Indirect free kick", "A teammate's pass"], a: 0,
    e: "There is no offside offence when receiving the ball directly from a goal kick, throw-in or corner kick." },
  { q: "A player receives the ball directly from a throw-in. Can it be offside?", c: ["Always", "No", "Only inside the penalty area", "It's up to the referee"], a: 1,
    e: "There is no offside from a throw-in received directly." },
  { q: "Which body parts are ignored when judging offside position?", c: ["Head", "Feet", "Torso", "Hands and arms"], a: 3,
    e: "Only the head, body and feet count. Hands and arms (up to the bottom of the armpit) are not considered." },
  { q: "An attacker is level with the second-last opponent. Is the attacker offside?", c: ["Offside", "Not offside", "Indirect free kick", "Assistant's call"], a: 1,
    e: "Level with the second-last opponent is not an offside position." },
  { q: "Can a player in their own half (including on the halfway line) be offside?", c: ["Yes", "No", "Only if the goalkeeper is off the line", "Only in the second half"], a: 1,
    e: "Offside position only exists in the opponents' half; the halfway line counts as your own half." },
  { q: "What is the sanction for an offside offence?", c: ["Direct free kick", "Indirect free kick", "Penalty kick", "Caution"], a: 1,
    e: "An indirect free kick to the opponents where the offence occurred." },

  // ---- Law 12: Fouls and misconduct ----
  { q: "A defender trips an opponent inside their own penalty area. What is awarded?", c: ["Indirect free kick", "Direct free kick", "Penalty kick", "Dropped ball"], a: 2,
    e: "A direct free kick offence inside the offender's own penalty area gives the opponents a penalty kick." },
  { q: "The goalkeeper handles a ball a teammate deliberately kicked back. What happens?", c: ["Nothing", "Indirect free kick to the opponents", "Penalty to the opponents", "The goalkeeper is cautioned"], a: 1,
    e: "Handling a deliberate back-pass gives the opponents an indirect free kick. Passes with the head or chest may be handled." },
  { q: "Under the 2025/26 Laws, what happens if the goalkeeper holds the ball for more than 8 seconds?", c: ["Caution", "Indirect free kick to the opponents", "Corner kick to the opponents", "Penalty to the opponents"], a: 2,
    e: "It used to be an indirect free kick after 6 seconds; since the 2025/26 Laws, holding it for more than 8 seconds gives the opponents a corner kick." },
  { q: "Which of these is a sending-off offence rather than a caution?", c: ["Dissent", "Delaying the restart", "Spitting at an opponent", "Not respecting the free-kick distance"], a: 2,
    e: "Spitting is a sending-off offence. Dissent, delaying the restart and not respecting the distance are cautions." },
  { q: "A player receives a second caution in the same match. What happens?", c: ["Only a fine", "Sent off", "Sent off for 10 minutes", "Only suspended for the next match"], a: 1,
    e: "A second caution in the same match means a sending-off (red card)." },
  { q: "An outfield player deliberately handles a ball that is going into the goal. What happens?", c: ["Caution and a free kick", "Sent off", "Only an indirect free kick", "Goal awarded"], a: 1,
    e: "Denying a goal or an obvious goal-scoring opportunity by deliberate handball is a sending-off (except a goalkeeper in their own area)." },

  // ---- Law 13: Free kicks ----
  { q: "At a free kick, how far must opponents be from the ball?", c: ["5 m", "9.15 m", "11 m", "16.5 m"], a: 1,
    e: "Opponents must be at least 9.15 m away; if they are closer, the kick is retaken." },
  { q: "An indirect free kick goes straight into the opponents' goal. What is the decision?", c: ["Goal", "Goal kick", "Retake", "Corner kick"], a: 1,
    e: "A goal only counts if the ball touches another player first. Straight in means a goal kick." },
  { q: "A direct free kick goes straight into the kicker's own goal. What is the decision?", c: ["Own goal", "Corner kick to the opponents", "Retake", "Goal kick"], a: 1,
    e: "A free kick that goes directly into the kicker's own goal is not a goal; the opponents get a corner kick." },
  { q: "How does the referee signal an indirect free kick?", c: ["Two whistle blasts", "Raising an arm above the head", "Stretching both arms sideways", "Holding up a yellow flag"], a: 1,
    e: "The referee raises an arm above the head and keeps it there until the ball touches another player or goes out." },

  // ---- Law 14: Penalty kick ----
  { q: "Where must the defending goalkeeper be at a penalty kick?", c: ["Anywhere in the goal area", "On the goal line between the posts", "1 m in front of the penalty mark", "Behind the goal"], a: 1,
    e: "The goalkeeper must stay on the goal line between the posts until the ball is kicked (at least part of one foot on or level with the line)." },
  { q: "Where must the other players be at a penalty kick?", c: ["Anywhere in the penalty area", "Outside the penalty area, behind the penalty mark, at least 9.15 m away", "Inside the centre circle", "Behind the goal line"], a: 1,
    e: "Players other than the kicker and goalkeeper must be outside the area, behind the penalty mark and at least 9.15 m from it." },
  { q: "A penalty hits the post and the kicker scores from the rebound. What is the decision?", c: ["Goal", "Indirect free kick to the opponents", "Retake the penalty", "Goal kick"], a: 1,
    e: "The kicker may not play the ball again until another player has touched it: indirect free kick to the opponents." },

  // ---- Laws 15–17: Throw-in, goal kick, corner kick ----
  { q: "A throw-in goes straight into the opponents' goal. What is the decision?", c: ["Goal", "Goal kick", "Retake the throw-in", "Corner kick"], a: 1,
    e: "A goal cannot be scored directly from a throw-in; straight into the opponents' goal means a goal kick." },
  { q: "What is the correct way to take a throw-in?", c: ["With one hand", "With both hands, from behind and over the head", "By kicking it", "With one foot inside the field"], a: 1,
    e: "Face the field, keep part of each foot on or behind the touchline, and throw with both hands from behind and over the head." },
  { q: "Where must the opponents be at a goal kick?", c: ["Outside the goal area", "Outside the penalty area until the ball is in play", "Inside the centre circle", "Anywhere"], a: 1,
    e: "Opponents must stay outside the penalty area until the ball is in play." },
  { q: "A goal kick goes straight into the opponents' goal. What is the decision?", c: ["Goal", "Retake the goal kick", "Corner kick", "Indirect free kick"], a: 0,
    e: "A goal may be scored directly against the opponents from a goal kick or a corner kick." },
  { q: "May the corner flagpost be moved when taking a corner kick?", c: ["Yes", "No", "If the referee allows it", "Only for left-footed players"], a: 1,
    e: "The ball is placed in the corner arc, and the corner flagpost must not be moved." },
];
