"""Replace the space between a number and its unit with a non-breaking space,
so "3–5 %" or "500 кг/ч" never wrap. Usage: python scripts/nbsp.py <files...>"""
import re
import sys

UNITS = r'(%|°C|кг/ч|кг/час|кг|кВт|мм|м²|м³/ч|м³/час|м³|м|об/мин|мг/л|л|с|шт\.|раз|рабочих|дней|месяцев|₽|kg/h|kW|mm|m²|m³/h|m|rpm|mg/l|RUB|working|days|months|卢布)'
# A number followed by a unit, or a thousands group ("1 500 000").
PATTERN = re.compile(r'(?<=\d) (?=' + UNITS + r'(?![\wа-яА-ЯёЁ])|\d{3}(?!\d))')

for path in sys.argv[1:]:
    with open(path, encoding='utf-8') as f:
        text = f.read()
    fixed, count = PATTERN.subn(' ', text)
    if count:
        with open(path, 'w', encoding='utf-8', newline='') as f:
            f.write(fixed)
    print(f'{path}: {count}')
