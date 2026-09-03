const GENERAL_RULES = `Поставь таймер и выбери устойчивое удобное положение сидя.
Спину держи естественно, без излишнего напряжения.
Если отвлёкся, спокойно верни внимание к практике — это нормальная часть медитации.
В тяжёлый день можно выполнить сокращённую практику длительностью 3 минуты и отметить задачу выполненной.`;

const TECHNIQUE_BREATHING = `Техника: наблюдение дыхания.

1. Сядь удобно и закрой глаза или опусти взгляд.
2. Сделай 2–3 спокойных вдоха и выдоха.
3. Не изменяй дыхание намеренно.
4. Наблюдай ощущения воздуха в ноздрях либо движение живота.
5. Когда заметишь, что отвлёкся, без критики верни внимание к дыханию.
6. После сигнала таймера сделай один глубокий вдох и спокойно закончи практику.`;

const TECHNIQUE_BODY_SCAN = `Техника: сканирование тела.

1. Сядь или ляг удобно.
2. Сделай несколько спокойных вдохов и выдохов.
3. Переводи внимание от стоп к голеням, коленям, бёдрам, животу, груди, рукам, плечам, шее и лицу.
4. В каждой области замечай тепло, холод, давление, напряжение или отсутствие выраженных ощущений.
5. Ничего не исправляй специально — только наблюдай.
6. Если отвлёкся, вернись к той части тела, на которой остановился.`;

const TECHNIQUE_THOUGHTS = `Техника: наблюдение мыслей.

1. Сядь удобно и несколько минут следи за дыханием.
2. Затем замечай появляющиеся мысли, не продолжая их намеренно.
3. Можно коротко обозначать происходящее: «мысль», «воспоминание», «планирование».
4. Не оценивай содержание мысли и не пытайся прогнать её.
5. После каждой замеченной мысли возвращай внимание к дыханию.`;

const TECHNIQUE_FREE = `Выбери одну из уже знакомых техник:

- наблюдение дыхания;
- сканирование тела;
- наблюдение мыслей.

Выполняй выбранную технику всю практику либо спокойно перейди к другой технике один раз в середине занятия.`;

const TECHNIQUE_LONG = `1. Первую треть времени наблюдай дыхание.
2. Вторую треть времени выполни сканирование тела.
3. Последнюю треть времени наблюдай мысли и возвращайся к дыханию после каждого отвлечения.
4. Последнюю минуту просто замечай общее состояние тела и ума.`;

function withGeneralRules(technique: string): string {
  return `${GENERAL_RULES}\n\n${technique}`;
}

export interface MeditationIntroDay {
  /** Смещение от start_date, 0-based (день 1 курса = offset 0). */
  dayOffset: number;
  itemKey: string;
  title: string;
  description: string;
}

/** 21 вводный день — создаются как обычные `tasks` на конкретные даты (раздел 12 ТЗ). */
export const MEDITATION_INTRO_DAYS: MeditationIntroDay[] = [
  // Неделя 1 — дыхание, 5 минут, дни 1-7 (offset 0-6)
  ...Array.from({ length: 7 }, (_, i) => ({
    dayOffset: i,
    itemKey: `meditation_day_${String(i + 1).padStart(2, '0')}`,
    title: '🧘 Медитация: дыхание — 5 минут',
    description: withGeneralRules(TECHNIQUE_BREATHING),
  })),
  // Неделя 2 — дыхание/тело чередуются, 7 минут, дни 8-14 (offset 7-13)
  {
    dayOffset: 7,
    itemKey: 'meditation_day_08',
    title: '🧘 Медитация: дыхание — 7 минут',
    description: withGeneralRules(TECHNIQUE_BREATHING),
  },
  {
    dayOffset: 8,
    itemKey: 'meditation_day_09',
    title: '🧘 Медитация: сканирование тела — 7 минут',
    description: withGeneralRules(TECHNIQUE_BODY_SCAN),
  },
  {
    dayOffset: 9,
    itemKey: 'meditation_day_10',
    title: '🧘 Медитация: дыхание — 7 минут',
    description: withGeneralRules(TECHNIQUE_BREATHING),
  },
  {
    dayOffset: 10,
    itemKey: 'meditation_day_11',
    title: '🧘 Медитация: сканирование тела — 7 минут',
    description: withGeneralRules(TECHNIQUE_BODY_SCAN),
  },
  {
    dayOffset: 11,
    itemKey: 'meditation_day_12',
    title: '🧘 Медитация: дыхание — 7 минут',
    description: withGeneralRules(TECHNIQUE_BREATHING),
  },
  {
    dayOffset: 12,
    itemKey: 'meditation_day_13',
    title: '🧘 Медитация: сканирование тела — 7 минут',
    description: withGeneralRules(TECHNIQUE_BODY_SCAN),
  },
  {
    dayOffset: 13,
    itemKey: 'meditation_day_14',
    title: '🧘 Медитация: дыхание — 7 минут',
    description: withGeneralRules(TECHNIQUE_BREATHING),
  },
  // Неделя 3 — дыхание/тело/мысли, 10 минут, дни 15-21 (offset 14-20)
  {
    dayOffset: 14,
    itemKey: 'meditation_day_15',
    title: '🧘 Медитация: дыхание — 10 минут',
    description: withGeneralRules(TECHNIQUE_BREATHING),
  },
  {
    dayOffset: 15,
    itemKey: 'meditation_day_16',
    title: '🧘 Медитация: сканирование тела — 10 минут',
    description: withGeneralRules(TECHNIQUE_BODY_SCAN),
  },
  {
    dayOffset: 16,
    itemKey: 'meditation_day_17',
    title: '🧘 Медитация: наблюдение мыслей — 10 минут',
    description: withGeneralRules(TECHNIQUE_THOUGHTS),
  },
  {
    dayOffset: 17,
    itemKey: 'meditation_day_18',
    title: '🧘 Медитация: дыхание — 10 минут',
    description: withGeneralRules(TECHNIQUE_BREATHING),
  },
  {
    dayOffset: 18,
    itemKey: 'meditation_day_19',
    title: '🧘 Медитация: сканирование тела — 10 минут',
    description: withGeneralRules(TECHNIQUE_BODY_SCAN),
  },
  {
    dayOffset: 19,
    itemKey: 'meditation_day_20',
    title: '🧘 Медитация: наблюдение мыслей — 10 минут',
    description: withGeneralRules(TECHNIQUE_THOUGHTS),
  },
  {
    dayOffset: 20,
    itemKey: 'meditation_day_21',
    title: '🧘 Медитация: свободная практика — 10 минут',
    description: withGeneralRules(TECHNIQUE_FREE),
  },
];

export interface MeditationCycleItem {
  /** Смещение от cycle_start_date (= start_date + 21 день), 0-based. */
  dayOffset: number;
  itemKey: string;
  title: string;
  description: string;
}

/** Бесконечный семидневный цикл, стартующий с 22-го дня курса (раздел 13 ТЗ). */
export const MEDITATION_CYCLE_ITEMS: MeditationCycleItem[] = [
  {
    dayOffset: 0,
    itemKey: 'meditation_cycle_1_breathing',
    title: '🧘 Медитация: дыхание — 10–15 минут',
    description: withGeneralRules(TECHNIQUE_BREATHING),
  },
  {
    dayOffset: 1,
    itemKey: 'meditation_cycle_2_body_scan',
    title: '🧘 Медитация: сканирование тела — 10–15 минут',
    description: withGeneralRules(TECHNIQUE_BODY_SCAN),
  },
  {
    dayOffset: 2,
    itemKey: 'meditation_cycle_3_breathing',
    title: '🧘 Медитация: дыхание — 10–15 минут',
    description: withGeneralRules(TECHNIQUE_BREATHING),
  },
  {
    dayOffset: 3,
    itemKey: 'meditation_cycle_4_thoughts',
    title: '🧘 Медитация: наблюдение мыслей — 10–15 минут',
    description: withGeneralRules(TECHNIQUE_THOUGHTS),
  },
  {
    dayOffset: 4,
    itemKey: 'meditation_cycle_5_breathing',
    title: '🧘 Медитация: дыхание — 10–15 минут',
    description: withGeneralRules(TECHNIQUE_BREATHING),
  },
  {
    dayOffset: 5,
    itemKey: 'meditation_cycle_6_free',
    title: '🧘 Свободная медитация — 15 минут',
    description: withGeneralRules(TECHNIQUE_FREE),
  },
  {
    dayOffset: 6,
    itemKey: 'meditation_cycle_7_long',
    title: '🧘 Длинная медитация — 20–30 минут',
    description: withGeneralRules(TECHNIQUE_LONG),
  },
];

export const MEDITATION_CARD_TEXT = `🧘 Медитация для новичка

1-я неделя — 5 минут в день
2-я неделя — 7 минут в день
3-я неделя — 10 минут в день
С 4-й недели — бесконечный семидневный цикл

В тяжёлый день практику можно сократить до 3 минут, но не отменять полностью.`;
