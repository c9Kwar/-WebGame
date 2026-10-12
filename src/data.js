export const VERSION = 1;
export const SAVE_KEY = 'still-archive.save.v1';
export const RARITIES = {
  common: { name: '흔적', label: 'TRACE', color: '#66857b', base: 18, factor: 1 },
  rare: { name: '기억', label: 'MEMORY', color: '#8a789d', base: 26, factor: 1.2 },
  epic: { name: '영원', label: 'ETERNITY', color: '#b78b45', base: 36, factor: 1.5 },
};
export const REGIONS = [
  { id: 0, name: '비가 멎은 거리', english: 'THE RAINLESS QUARTER', subtitle: '우산을 접어도 좋은 곳', power: 0, ink: 32, dust: 3, xp: 20, color: '#667d79', chapter: 'I', scene: 'street', description: '마지막 빗방울이 공중에 멈춘 거리. 누군가 두고 간 기억이 가로등 아래 조용히 반짝입니다.', lines: ['구두 소리만이 젖은 보도를 지나갑니다.', '가로등 아래, 시간이 조금 접혀 있습니다.', '닫힌 찻집에서 아직 따뜻한 찻잔을 찾았습니다.', '우체통 속에 받는 사람이 없는 편지가 있습니다.'] },
  { id: 1, name: '새벽의 온실', english: 'THE GLASS GARDEN', subtitle: '빛을 기억하는 잎사귀', power: 160, ink: 58, dust: 5, xp: 28, color: '#687d58', chapter: 'II', scene: 'garden', description: '햇살이 들지 않아도 자라는 꽃들. 유리 지붕을 두드리는 것은 비가 아니라 오래된 노랫소리입니다.', lines: ['유리 너머로 푸른 그림자가 움직입니다.', '잎사귀에 묻은 빛을 작은 병에 담습니다.', '이름 모를 꽃이 당신을 향해 고개를 듭니다.', '정원사의 수첩에는 내일의 날씨가 적혀 있습니다.'] },
  { id: 2, name: '무명의 극장', english: 'THE NAMELESS THEATRE', subtitle: '막이 내린 뒤의 이야기', power: 300, ink: 96, dust: 7, xp: 38, color: '#826168', chapter: 'III', scene: 'theatre', description: '관객이 떠난 뒤에도 끝나지 않는 연극. 빈 무대 위에, 한 번도 불리지 않은 이름이 남아 있습니다.', lines: ['붉은 막 뒤에서 작은 박수 소리가 들립니다.', '객석의 먼지를 털어내자 이름 하나가 드러납니다.', '빛이 꺼진 무대에서 은빛 가면을 발견합니다.', '프로그램의 마지막 장은 아직 쓰이지 않았습니다.'] },
  { id: 3, name: '별을 읽는 탑', english: 'THE ASTRAL OBSERVATORY', subtitle: '우리가 놓친 별의 궤도', power: 480, ink: 148, dust: 9, xp: 50, color: '#69788e', chapter: 'IV', scene: 'tower', description: '낮에도 별이 보이는 오래된 관측소. 망원경을 들여다보면 하늘 대신 누군가의 어제가 보입니다.', lines: ['나선 계단 끝에서 낯선 별자리를 만납니다.', '별빛을 따라 잊힌 이름을 읽어 내려갑니다.', '천구의가 당신의 발걸음에 맞춰 돌아갑니다.', '지구본 한가운데 작은 바다가 생겨납니다.'] },
  { id: 4, name: '파도의 도서관', english: 'THE TIDAL LIBRARY', subtitle: '끝내 지워지지 않은 문장', power: 680, ink: 220, dust: 12, xp: 65, color: '#547a86', chapter: 'V', scene: 'library', description: '밀물이 올 때마다 새로운 책이 떠오르는 도서관. 젖은 종이 사이에는 바다가 삼키지 못한 문장이 있습니다.', lines: ['책장 사이로 느린 파도가 지나갑니다.', '책갈피에 남은 소금에서 먼 항구의 냄새가 납니다.', '물 위에 떠 있는 책 한 권을 건져 올립니다.', '지워진 문장이 손끝의 온기에 되살아납니다.'] },
  { id: 5, name: '영원이 머문 역', english: 'THE LAST STATION', subtitle: '도착하지 않아도 괜찮은 곳', power: 850, ink: 310, dust: 16, xp: 85, color: '#9a815b', chapter: 'VI', scene: 'station', description: '시각표에 없는 기차를 기다리는 사람들. 이곳의 시계는 서두르지 않는 사람에게만 시간을 알려 줍니다.', lines: ['플랫폼 끝에 기차의 따뜻한 불빛이 보입니다.', '차창에 비친 풍경은 잊고 있던 당신의 집입니다.', '차장은 표 대신 오래된 기억 하나를 받습니다.', '출발 종이 울립니다. 아직 타지 않아도 괜찮습니다.'] },
];
const entries = [
  ['비를 담은 회중시계', 'clock', 'common', '멈춘 시계도 하루에 두 번은 누군가의 귀가를 기다린다.'],
  ['보내지 않은 편지', 'letter', 'common', '봉투를 열면 이름보다 먼저 그리운 목소리가 들린다.'],
  ['밤의 찻잔', 'cup', 'rare', '마지막 한 모금에는 언제나 조금의 달빛이 남아 있다.'],
  ['가로등의 심장', 'lantern', 'rare', '누군가 돌아올 길을 잃지 않도록, 아직 식지 않은 불씨.'],
  ['열세 번째 종소리', 'bell', 'epic', '세상에 없는 시간을 알리는 종. 귀를 기울이면 내일이 들린다.'],
  ['빛의 씨앗', 'seed', 'common', '땅 대신 손바닥에 심어도 자라는 작은 약속.'],
  ['유리 나비', 'butterfly', 'common', '날갯짓을 멈춘 순간에만 볼 수 있는 투명한 무늬.'],
  ['정원사의 열쇠', 'key', 'rare', '모든 문을 열 수는 없어도, 돌아갈 문 하나는 열 수 있다.'],
  ['계절의 향수', 'bottle', 'rare', '뚜껑을 여는 사람마다 서로 다른 계절을 떠올린다.'],
  ['새벽을 피우는 꽃', 'flower', 'epic', '피어나기까지 백 년. 바라보는 순간만큼은 영원.'],
  ['배우의 단추', 'button', 'common', '화려한 의상이 사라진 뒤에도 역할 하나를 꼭 붙잡고 있다.'],
  ['붉은 깃펜', 'feather', 'common', '쓰지 않은 이야기를 가장 많이 기억하는 펜.'],
  ['달의 가면', 'mask', 'rare', '가면을 쓰면 숨기는 것이 아니라 잊었던 얼굴을 찾게 된다.'],
  ['조용한 오르골', 'music', 'rare', '태엽을 감지 않아도 좋아하는 사람 곁에서는 노래한다.'],
  ['마지막 앙코르', 'rose', 'epic', '아무도 없는 객석에서 들려온 단 한 번의 진심 어린 박수.'],
  ['별의 파편', 'star', 'common', '별이 떨어진 자리는 상처가 아니라 작은 창이 되었다.'],
  ['밤의 나침반', 'compass', 'common', '북쪽 대신 마음이 가장 고요해지는 곳을 가리킨다.'],
  ['궤도의 반지', 'ring', 'rare', '서로를 놓치지 않으려는 두 별의 느린 약속.'],
  ['푸른 천구의', 'orbit', 'rare', '우리가 모르는 별에도 이름을 붙여 주는 기구.'],
  ['첫 번째 새벽별', 'sun', 'epic', '밤의 가장 깊은 곳에서 다음 날을 준비하던 빛.'],
  ['소금의 책갈피', 'leaf', 'common', '마지막으로 읽은 문장 옆에 작은 파도가 남아 있다.'],
  ['파도의 잉크병', 'bottle', 'common', '바다를 쓰면 파란색, 집을 쓰면 따뜻한 갈색이 된다.'],
  ['조개의 속삭임', 'shell', 'rare', '바다 소리인 줄 알았는데, 오래전 들었던 자장가였다.'],
  ['기억의 돋보기', 'mirror', 'rare', '작은 글씨보다 지나쳤던 다정함을 더 잘 보여 준다.'],
  ['끝나지 않는 책', 'book', 'epic', '마지막 장에는 언제나 빈자리가 있다. 당신의 몫이다.'],
  ['편도 승차권', 'ticket', 'common', '돌아오는 표는 필요 없다. 모든 길은 어딘가에서 이어진다.'],
  ['차장의 별', 'badge', 'common', '길을 잃은 사람에게만 조금 더 환하게 빛나는 배지.'],
  ['황혼의 모래시계', 'hourglass', 'rare', '모래가 떨어지는 속도는 기다리는 마음에 달려 있다.'],
  ['돌아갈 집의 열쇠', 'key', 'rare', '잠금장치의 모양은 몰라도 문을 찾으면 바로 알게 된다.'],
  ['내일의 작은 태양', 'sun', 'epic', '오늘을 충분히 살아낸 사람의 주머니에 조용히 떠오른다.'],
];
export const RELICS = entries.map(([name, shape, rarity, quote], index) => ({ id: `r${index}`, name, shape, rarity, quote, region: Math.floor(index / 5), number: String(index + 1).padStart(3, '0') }));
export const RESEARCH = [
  { id: 'focus', name: '기억의 초점', description: '단계마다 공명력 +12', icon: 'focus', max: 10, cost: 100, growth: 1.48 },
  { id: 'ink', name: '섬세한 필사', description: '단계마다 탐사 잉크 +8%', icon: 'feather', max: 10, cost: 120, growth: 1.48 },
  { id: 'dust', name: '잔향 채집', description: '단계마다 탐사 잔향 +10%', icon: 'star', max: 8, cost: 160, growth: 1.55 },
  { id: 'rest', name: '창가의 시간', description: '단계마다 휴식 잉크 +20%', icon: 'clock', max: 6, cost: 140, growth: 1.6 },
];
export const MILESTONES = [
  { id: 'first', name: '첫 번째 발자국', description: '탐사 1회 완료', goal: 1, metric: 'runs', ink: 50, dust: 5 },
  { id: 'three', name: '작은 서고', description: '서로 다른 유물 3종 수집', goal: 3, metric: 'collection', ink: 100, dust: 10 },
  { id: 'ten', name: '익숙해지는 발걸음', description: '탐사 10회 완료', goal: 10, metric: 'runs', ink: 200, dust: 15 },
  { id: 'restore', name: '기억을 잇는 손', description: '복원 10회 완료', goal: 10, metric: 'upgrades', ink: 250, dust: 20 },
  { id: 'six', name: '기억의 수집가', description: '서로 다른 유물 10종 수집', goal: 10, metric: 'collection', ink: 400, dust: 30 },
  { id: 'thirty', name: '서두르지 않는 여행', description: '탐사 30회 완료', goal: 30, metric: 'runs', ink: 500, dust: 40 },
  { id: 'hundred', name: '백 번의 작은 발견', description: '탐사 100회 완료', goal: 100, metric: 'runs', ink: 1200, dust: 80 },
  { id: 'twenty', name: '잊힌 것들의 집', description: '서로 다른 유물 20종 수집', goal: 20, metric: 'collection', ink: 2000, dust: 100 },
  { id: 'complete', name: '당신이라는 서고', description: '유물 30종 모두 수집', goal: 30, metric: 'collection', ink: 4000, dust: 200 },
];
export const STORIES = [
  { title: '서고의 문을 열며', condition: '처음부터 열려 있는 기록', region: -1, text: '당신이 도착했을 때, 도시는 막 비를 그친 참이었습니다.\n\n골목 끝의 작은 서고에는 문패 대신 한 문장이 걸려 있었습니다.\n“사라진 것은 없어. 다만 아직 발견되지 않았을 뿐.”\n\n책상 위에는 회중시계 하나와 빈 장부가 놓여 있었습니다. 시계는 멈춰 있었지만, 이상하게도 늦었다는 기분은 들지 않았습니다.\n\n당신은 첫 장에 오늘의 날짜 대신 이렇게 적었습니다.\n“천천히 시작해도 괜찮은 날.”' },
  ...REGIONS.map((r, i) => ({ title: ['누군가의 귀갓길', '봄을 기다리지 않는 꽃', '빈 객석의 박수', '별에도 이름이 필요해서', '바다가 남겨 둔 한 줄', '돌아오는 길에 관하여'][i], region: i, condition: `${r.name} 유물 3종 수집`, text: [
    '거리의 시계들은 모두 다른 시간을 가리키고 있었습니다.\n\n처음에는 고장이라고 생각했습니다. 하지만 편지 속 날짜를 읽고 나서야 알게 되었습니다. 시계는 각자의 가장 소중한 순간에 머물러 있었던 것입니다.\n\n서고로 돌아오는 길, 당신은 회중시계를 맞추지 않기로 했습니다. 어떤 시간은 흘려보내지 않아도 괜찮으니까요.',
    '정원사는 꽃이 피는 날짜를 적지 않았습니다. 대신 처음 그 꽃을 보고 웃었던 사람의 이름을 적었습니다.\n\n당신은 빈 화분에 빛의 씨앗을 심었습니다. 물을 얼마나 줘야 하는지 몰랐지만, 매일 한 번은 들여다보기로 했습니다.\n\n돌아설 때 작은 잎 하나가 고개를 내밀었습니다. 아마도 필요한 것은 물만은 아니었던 모양입니다.',
    '프로그램에는 단 한 명의 배우도 적혀 있지 않았습니다.\n\n마지막 페이지를 넘기자 작은 메모가 떨어졌습니다. “오늘 객석에 있던 모두가 이 이야기의 주인공입니다.”\n\n당신은 텅 빈 무대를 향해 박수를 쳤습니다. 오래된 목재 바닥이 작은 울림으로 답했습니다.',
    '천문학자의 노트에는 새로운 별의 좌표보다 편지가 많았습니다.\n\n“오늘도 너를 닮은 별을 찾았어. 이름을 붙이려다 그냥 두었어. 내일도 찾아볼 이유가 필요해서.”\n\n당신은 천구의를 한 바퀴 돌렸습니다. 닿을 수 없어서 아름다운 것들이 느리게 지나갔습니다.',
    '밀물이 빠져나간 자리에서 젖지 않은 종이 한 장을 찾았습니다.\n\n거기에는 긴 소설도 위대한 비밀도 없었습니다.\n“저녁은 먹었니.”\n\n당신은 그 문장을 서고의 가장 잘 보이는 곳에 놓았습니다. 어떤 말은 수백 권의 책보다 무거웠습니다.',
    '마지막 역에는 시각표가 없었습니다. 차장은 당신이 모아 온 유물을 하나씩 바라보았습니다.\n\n“많이 돌아왔네요.”\n“많이 떠나왔다고 생각했는데요.”\n\n차장은 웃으며 빈 승차권을 건넸습니다.\n“어디든 괜찮아요. 이제 돌아올 곳이 있잖아요.”\n\n당신은 서고의 열쇠를 만졌습니다. 이야기는 끝나지 않았습니다. 내일도, 조금씩.'
  ][i] })),
];
