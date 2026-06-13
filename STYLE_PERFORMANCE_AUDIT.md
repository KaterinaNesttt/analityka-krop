# Style Performance Audit

## Знайдено

| Ризик | Місце | Проблема |
| --- | --- | --- |
| HIGH | `src/styles.css` `.glass-edge` | Базовий `Card` мав live `backdrop-filter`, тому blur множився на всі картки, dashboard, таблиці та форми. |
| HIGH | `src/styles.css` `.asset-sidebar`, `.asset-mobar` | Fixed/sidebar surfaces мали повноплощинний `backdrop-filter` + shadow, що дорого для Safari/Chrome PWA на macOS. |
| HIGH | `src/pages/SalesListPage.tsx` | Header, filters, table shell і sticky `thead` мали `backdrop-blur-md` та великі `shadow-[...]` у scroll-heavy зоні. |
| MEDIUM | `src/styles.css` `.glass-pressed-edge`, `.glass-outpress-edge` | 6-8 inset shadow layers на повторюваних елементах створювали зайве paint-навантаження. |
| MEDIUM | `src/components/analytics-charts.tsx` | Map overlay використовував `mixBlendMode` + `filter: contrast(...)`. |
| MEDIUM | `src/components/ui/*` | Частина primitives мала `transition-all` або hover shadow, що могло анімувати зайві властивості. |
| LOW | shadcn popovers/dialogs/dropdowns/tooltips | Є невеликі `shadow-md/lg` та opacity/transform animations, але вони короткоживучі й не в scroll-heavy контейнерах. |
| LOW | skeleton loaders | `animate-pulse` залишився для loading states; це короткочасна opacity-анімація без blur/filter. |

Не знайдено активних `will-change`, `translateZ(0)`, `transform-gpu`, `drop-shadow`, `bg-fixed` або анімованих `filter` / `backdrop-filter`.

## Змінені файли

- `src/styles.css`
- `src/components/app-sidebar.tsx`
- `src/pages/SalesListPage.tsx`
- `src/layouts/AuthenticatedLayout.tsx`
- `src/components/analytics-charts.tsx`
- `src/components/ui/accordion.tsx`
- `src/components/ui/input-otp.tsx`
- `src/components/ui/progress.tsx`
- `src/components/ui/sidebar.tsx`
- `src/components/ui/tabs.tsx`

## Що оптимізовано

- `.glass-edge` переведено з live blur на статичну glass-імітацію: translucent surface, border edge, короткий shadow token і легкий inset highlight.
- Sidebar і mobile bottom bar більше не використовують `backdrop-filter`; глибина збережена через tint, subtle gradient edge і коротший shadow.
- Pressed/outpress glass edge зменшено з 6-8 inset layers до 2-3 шарів.
- Sales list позбавлено `backdrop-blur-md` на header, filters, table shell і sticky header; великі shadows замінено коротшими.
- Fixed offline/sync badge більше не має blur; використано щільніший фон і малу тінь.
- Map overlay у charts більше не використовує `mixBlendMode` та CSS `filter`.
- `transition-all` звужено до `transition-colors`, `transition-[width]` або `transition-[left,right]`; hover shadow у sidebar outline variant замінено на border color.
- У sidebar footer прибрано nested `<button>` через `Button asChild`, щоб React smoke не ловив HTML nesting error.

## Що залишилось навмисно

- Static PNG surface layers (`surface-*`, `asset-*`) залишені, бо вони формують Liquid Glass стиль без live blur.
- Невеликі `shadow-sm/md/lg` у shadcn overlays залишені, бо popovers/dialogs/dropdowns короткоживучі й не покривають великі scroll surfaces.
- `animate-pulse` залишено для skeleton/loading states.
- Fixed background image залишено без blur/filter; це ключова частина теми, і він не використовує `bg-fixed`.

## Рекомендації

- Не додавати `backdrop-filter` на `Card`, layout, sidebar, table, dashboard або scroll containers.
- Для glass ефекту використовувати tokens у `src/styles.css`: tint, border, inset highlight, коротку 1-2 layer shadow.
- Не анімувати `box-shadow`, `filter`, `backdrop-filter`; для hover використовувати `background-color`, `border-color`, `opacity` або легкий `transform`.
- Не ставити постійний `will-change`; додавати тільки тимчасово для конкретної анімації.
- У sticky/fixed елементах уникати blur і великих shadows.
- Для великих декоративних площин використовувати статичні зображення або легкі gradients без фільтрів.

## Чеклист для нових компонентів

- Немає `backdrop-blur-*` або `backdrop-filter` на великих контейнерах.
- Немає `filter`, `mix-blend-mode`, `drop-shadow` без явної потреби.
- Shadows мають 1-2 короткі шари.
- Hover не міняє shadow/filter/blur.
- `transition-all` не використовується.
- Sticky/fixed елементи мають opaque/tinted background без blur.
- Loading animation не покриває великі full-page surfaces.
