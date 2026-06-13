# Design Rules

## Напрям

- Основний стиль: дуже темний / black / Liquid Glass.
- Акцент: золото.
- Не використовувати синій як домінантний колір, якщо цього прямо не вимагає задача.
- Інтерфейс має бути робочим, щільним, придатним для перегляду аналітики та таблиць.

## Існуюча система

- Токени кольорів і радіусів визначені у `src/styles.css`.
- Темна тема має gold primary/ring і glass-like surfaces.
- Є PNG-based surface classes для Liquid Glass:
  - `.app-fixed-bg`
  - `.asset-sidebar`
  - `.asset-active-pill`
  - `.asset-team-pill`
  - `.surface-primary`
  - `.surface-secondary`
  - `.surface-market`
  - `.surface-market-row`
  - `.surface-stat`
  - `.surface-vault`
  - `.surface-upgrade`
  - `.surface-alpha`
  - `.surface-flow`
- Є glass utility classes:
  - `.glass-edge`
  - `.glass-pressed-edge`
  - `.glass-outpress-edge`
  - `.inset-surface`

## Правила UI змін

- Reuse існуючі shadcn/ui компоненти і локальні класи.
- Не додавати нову дизайн-систему поруч з наявною.
- Не робити broad restyle без прямого запиту.
- Не міняти кириличні тексти без потреби.
- Для dashboard/table screens пріоритет: читабельність, компактність, стабільні відступи, зрозумілі стани.
- Для icon buttons використовувати `lucide-react`, якщо іконка існує.
- Не додавати сині gradients/orbs/decorations.

## Responsive

- Перевіряти, щоб текст не виходив за межі кнопок, карток і таблиць.
- Для фіксованих UI блоків використовувати стабільні dimensions/responsive constraints.
- Не масштабувати font-size через viewport width.
