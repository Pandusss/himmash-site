import type { Lang } from '../i18n';

export interface DocumentMeta {
  /** Anchor on the documents page. */
  id: string;
  /** Scan inside /public/img/docs. */
  image: string;
  width: number;
  height: number;
  years: string;
  /** Expired certificates stay on the site as history. */
  archive: boolean;
}

export interface DocumentText {
  title: string;
  kind: string;
  /** Issuing system or organisation printed at the top of the document. */
  header: string;
  /** Main title of the document as printed. */
  heading: string;
  fields: [string, string][];
  /** Closing line printed at the bottom, if any. */
  footer?: string;
}

export const documents: DocumentMeta[] = [
  { id: 'certificate-kptbo-300', image: '00-other-07-800.webp', width: 800, height: 1132, years: '2018–2021', archive: true },
  { id: 'specifications-kptbo-300', image: '00-other-05-800.webp', width: 800, height: 1115, years: '2018', archive: false },
  { id: 'certificate-granulation-line', image: '00-other-06-800.webp', width: 800, height: 1085, years: '2007–2010', archive: true },
  { id: 'specifications-granulation-line', image: '00-other-08-800.jpg', width: 800, height: 1131, years: '2002', archive: false },
];

// Transcribed from the scans. Translations are for information; the Russian original prevails.
const texts: Record<Lang, Record<string, DocumentText>> = {
  ru: {
    'certificate-kptbo-300': {
      title: 'Сертификат соответствия на комплекс КПТБО-300',
      kind: 'Сертификат соответствия',
      header: 'Система сертификации ГОСТ Р · Федеральное агентство по техническому регулированию и метрологии · Добровольная сертификация',
      heading: 'Сертификат соответствия № РОСС RU.НА34.Н11554',
      fields: [
        ['Срок действия', 'с 22.08.2018 по 21.08.2021'],
        ['Номер бланка', '0272087'],
        ['Орган по сертификации', 'RA.RU.11НА34. Орган по сертификации продукции ООО «Вега». Адрес: 248033, Россия, Калужская область, город Калуга, Первый академический проезд, дом 5, корпус 1Д'],
        ['Продукция', 'Комплекс переработки полимерных твёрдых бытовых отходов производительностью 300 кг/час (КПТБО-300). Серийный выпуск'],
        ['Код ОК', '28.99.39.190'],
        ['Код ТН ВЭД', '8477'],
        ['Соответствует требованиям нормативных документов', 'Продукция изготовлена в соответствии с Техническими условиями ТУ 28.99.39-001-32382078-2018'],
        ['Изготовитель', 'Общество с ограниченной ответственностью Научно-производственное объединение «ХИММАШ». ОГРН 1186196033473, ИНН 6154153061, КПП 615401001. Адрес: 347939, Россия, Ростовская область, город Таганрог, Мариупольское шоссе, дом 5, строение 8'],
        ['Сертификат выдан', 'ООО НПО «ХИММАШ» (реквизиты — как у изготовителя)'],
        ['На основании', 'Протокол испытаний № 003/R-20/09/18 от 22.08.2018, выданный испытательной лабораторией «Тест-Эксперт» (аттестат аккредитации № РОСС RU.31578.04ОЛН0.ИЛ03 от 09.01.2017 по 09.01.2020)'],
        ['Дополнительная информация', 'Условия хранения и срок службы указаны в товаросопроводительной и эксплуатационной документации. Схема сертификации: 3'],
        ['Подписи', 'Руководитель органа — А. Н. Золотов; эксперт — А. А. Белянин'],
      ],
      footer: 'Сертификат не применяется при обязательной сертификации.',
    },
    'specifications-kptbo-300': {
      title: 'Технические условия на комплекс КПТБО-300',
      kind: 'Технические условия',
      header: 'Общество с ограниченной ответственностью НПО «Химмаш» · ОКПД2 28.99.39.190',
      heading: 'Комплекс переработки полимерных твёрдых бытовых отходов производительностью 300 кг/час (КПТБО-300). Технические условия ТУ 28.99.39-001-32382078-2018',
      fields: [
        ['Утверждено', 'Генеральный директор ООО НПО «Химмаш» Г. Г. Горбенко, 01 октября 2018 г.'],
        ['Дата введения', '01.10.2018'],
        ['Срок действия', 'Без ограничения срока действия'],
        ['Разработчик', 'ООО НПО «Химмаш»'],
        ['Место и год', 'Таганрог, 2018'],
      ],
      footer: 'Собственность ООО НПО «Химмаш»: не копировать и не передавать организациям и частным лицам.',
    },
    'certificate-granulation-line': {
      title: 'Сертификат соответствия на линию отмыва, сушки и гранулирования',
      kind: 'Сертификат соответствия',
      header: 'Система сертификации ГОСТ Р · Госстандарт России',
      heading: 'Сертификат соответствия № РОСС RU.АИ50.В08814',
      fields: [
        ['Срок действия', 'с 24.08.2007 по 23.08.2010'],
        ['Номер бланка', '7441942'],
        ['Орган по сертификации', 'Рег. № РОСС RU.0001.11АИ50. ОС продукции автономной некоммерческой организации «Академмаш». Адрес: 115404, Москва, 11-я Радиальная ул., 2, оф. 213'],
        ['Продукция', 'Линия для отмыва, сушки и гранулирования полиолефинов. Серийный выпуск'],
        ['Код ОК 005 (ОКП)', '36 2710'],
        ['Соответствует требованиям нормативных документов', 'ГОСТ 12.2.003-91, ГОСТ 12.1.003-83, ГОСТ 12.1.012-90, ГОСТ МЭК 60204-1-99'],
        ['Изготовитель', 'ООО «Ростхиммаш», 344090, г. Ростов-на-Дону, ул. Доватора, 164/3'],
        ['Сертификат выдан', 'ООО «Ростхиммаш», 344090, г. Ростов-на-Дону, ул. Доватора, 164/3'],
        ['На основании', 'Протокол сертификационных испытаний № 156.08-07 от 24.08.2007, испытательный центр ООО «ГРЕД» (рег. № РОСС RU.0001.21АЮ82 от 25.01.2007 до 25.01.2010; 180014, г. Псков, ул. Н. Васильева, 110); акт о результатах анализа состояния производства № 335 от 16.08.2007'],
        ['Дополнительная информация', 'Знак соответствия по ГОСТ Р 50460-92 наносится на корпус изделия и (или) в эксплуатационную документацию. Схема сертификации: 3а'],
        ['Подписи', 'Руководитель органа — И. Л. Еникеев; эксперт — А. Н. Лукьянов'],
      ],
      footer: 'Сертификат имеет юридическую силу на всей территории Российской Федерации.',
    },
    'specifications-granulation-line': {
      title: 'Технические условия на линию производства гранул',
      kind: 'Технические условия',
      header: 'ОКП 362714 · Группа Г48',
      heading: 'Линия для производства гранул из полимерных материалов. Технические условия ТУ 3627-004-57500277-2002',
      fields: [
        ['Утверждено', 'Директор ООО «Ростхиммаш» Г. Г. Горбенко, август 2002 г.'],
        ['Дата введения', '20.08.2002'],
        ['Разработчик', 'ООО «Ростхиммаш», главный конструктор А. В. Кузьмин'],
        ['Регистрация', 'Госстандарт России, ФГУ «Ростовский ЦСМ»: внесено в реестр под № 006433, 16.08.2002'],
      ],
    },
  },
  en: {
    'certificate-kptbo-300': {
      title: 'Certificate of Conformity for the KPTBO-300 complex',
      kind: 'Certificate of Conformity',
      header: 'GOST R Certification System · Federal Agency on Technical Regulating and Metrology · Voluntary certification',
      heading: 'Certificate of Conformity No. РОСС RU.НА34.Н11554',
      fields: [
        ['Valid', 'from 22.08.2018 to 21.08.2021'],
        ['Form number', '0272087'],
        ['Certification body', 'RA.RU.11НА34. Product certification body of Vega LLC. Address: 5 Pervy Akademichesky proezd, bldg. 1D, Kaluga, Kaluga Oblast, 248033, Russia'],
        ['Products', 'Complex for processing polymer municipal solid waste, capacity 300 kg/h (KPTBO-300). Serial production'],
        ['Classifier code (OK)', '28.99.39.190'],
        ['HS code (TN VED)', '8477'],
        ['Complies with regulatory documents', 'Manufactured in accordance with Technical Specifications TU 28.99.39-001-32382078-2018'],
        ['Manufacturer', 'Limited Liability Company Research and Production Association HIMMASH. OGRN 1186196033473, INN 6154153061, KPP 615401001. Address: 5 Mariupolskoye shosse, bldg. 8, Taganrog, Rostov Oblast, 347939, Russia'],
        ['Certificate issued to', 'NPO HIMMASH LLC (details as for the manufacturer)'],
        ['Issued on the basis of', 'Test report No. 003/R-20/09/18 of 22.08.2018 issued by the Test-Expert testing laboratory (accreditation certificate No. РОСС RU.31578.04ОЛН0.ИЛ03, valid 09.01.2017–09.01.2020)'],
        ['Additional information', 'Storage conditions and service life are specified in the shipping and operating documentation. Certification scheme: 3'],
        ['Signed by', 'Head of the certification body A. N. Zolotov; expert A. A. Belyanin'],
      ],
      footer: 'The certificate does not apply to mandatory certification.',
    },
    'specifications-kptbo-300': {
      title: 'Technical Specifications for the KPTBO-300 complex',
      kind: 'Technical Specifications',
      header: 'NPO Himmash Limited Liability Company · OKPD2 28.99.39.190',
      heading: 'Complex for processing polymer municipal solid waste, capacity 300 kg/h (KPTBO-300). Technical Specifications TU 28.99.39-001-32382078-2018',
      fields: [
        ['Approved by', 'G. G. Gorbenko, General Director of NPO Himmash LLC, 1 October 2018'],
        ['Effective date', '01.10.2018'],
        ['Validity', 'No expiry date'],
        ['Developed by', 'NPO Himmash LLC'],
        ['Place and year', 'Taganrog, 2018'],
      ],
      footer: 'Property of NPO Himmash LLC: do not copy or transfer to organisations or individuals.',
    },
    'certificate-granulation-line': {
      title: 'Certificate of Conformity for the washing, drying and pelletizing line',
      kind: 'Certificate of Conformity',
      header: 'GOST R Certification System · Gosstandart of Russia',
      heading: 'Certificate of Conformity No. РОСС RU.АИ50.В08814',
      fields: [
        ['Valid', 'from 24.08.2007 to 23.08.2010'],
        ['Form number', '7441942'],
        ['Certification body', 'Reg. No. РОСС RU.0001.11АИ50. Product certification body of the autonomous non-profit organisation Akademmash. Address: 2 11th Radialnaya St., office 213, Moscow, 115404'],
        ['Products', 'Line for washing, drying and pelletizing polyolefins. Serial production'],
        ['Classifier code OK 005 (OKP)', '36 2710'],
        ['Complies with regulatory documents', 'GOST 12.2.003-91, GOST 12.1.003-83, GOST 12.1.012-90, GOST IEC 60204-1-99'],
        ['Manufacturer', 'Rosthimmash LLC, 164/3 Dovatora St., Rostov-on-Don, 344090'],
        ['Certificate issued to', 'Rosthimmash LLC, 164/3 Dovatora St., Rostov-on-Don, 344090'],
        ['Issued on the basis of', 'Certification test report No. 156.08-07 of 24.08.2007, GRED LLC testing centre (reg. No. РОСС RU.0001.21АЮ82, valid 25.01.2007–25.01.2010; 110 N. Vasilyeva St., Pskov, 180014); production assessment report No. 335 of 16.08.2007'],
        ['Additional information', 'The conformity mark under GOST R 50460-92 is applied to the product body and/or the operating documentation. Certification scheme: 3a'],
        ['Signed by', 'Head of the certification body I. L. Enikeev; expert A. N. Lukyanov'],
      ],
      footer: 'The certificate is legally valid throughout the Russian Federation.',
    },
    'specifications-granulation-line': {
      title: 'Technical Specifications for the pellet production line',
      kind: 'Technical Specifications',
      header: 'OKP 362714 · Group G48',
      heading: 'Line for producing pellets from polymer materials. Technical Specifications TU 3627-004-57500277-2002',
      fields: [
        ['Approved by', 'G. G. Gorbenko, Director of Rosthimmash LLC, August 2002'],
        ['Effective date', '20.08.2002'],
        ['Developed by', 'Rosthimmash LLC, chief designer A. V. Kuzmin'],
        ['Registration', 'Gosstandart of Russia, Rostov Centre for Standardization and Metrology: entered in the register under No. 006433 on 16.08.2002'],
      ],
    },
  },
  zh: {
    'certificate-kptbo-300': {
      title: 'KPTBO-300 综合处理设备符合性证书',
      kind: '符合性证书',
      header: 'ГОСТ Р 认证体系 · 俄罗斯联邦技术调节与计量局 · 自愿认证',
      heading: '符合性证书 编号 РОСС RU.НА34.Н11554',
      fields: [
        ['有效期', '2018年8月22日至2021年8月21日'],
        ['证书表格编号', '0272087'],
        ['认证机构', 'RA.RU.11НА34。Vega 有限责任公司产品认证机构。地址：俄罗斯卡卢加州卡卢加市第一学院通道5号1D栋，邮编248033'],
        ['产品', '聚合物城市固体废物处理综合设备，处理能力300公斤/小时（KPTBO-300）。批量生产'],
        ['分类代码（OK）', '28.99.39.190'],
        ['海关编码（ТН ВЭД）', '8477'],
        ['符合规范性文件要求', '产品按照技术条件 TU 28.99.39-001-32382078-2018 制造'],
        ['制造商', 'HIMMASH 科研生产联合体有限责任公司。国家注册号（OGRN）1186196033473，纳税人识别号（INN）6154153061，税务登记代码（KPP）615401001。地址：俄罗斯罗斯托夫州塔甘罗格市马里乌波尔公路5号8栋，邮编347939'],
        ['证书颁发对象', 'NPO HIMMASH 有限责任公司（信息同制造商）'],
        ['颁发依据', 'Test-Expert 检测实验室于2018年8月22日出具的第 003/R-20/09/18 号检测报告（认可证书编号 РОСС RU.31578.04ОЛН0.ИЛ03，有效期2017年1月9日至2020年1月9日）'],
        ['附加信息', '储存条件和使用寿命见随货文件及操作文件。认证方案：3'],
        ['签署', '认证机构负责人 A. N. Zolotov；专家 A. A. Belyanin'],
      ],
      footer: '本证书不适用于强制认证。',
    },
    'specifications-kptbo-300': {
      title: 'KPTBO-300 综合处理设备技术条件',
      kind: '技术条件',
      header: 'NPO Himmash 有限责任公司 · OKPD2 28.99.39.190',
      heading: '聚合物城市固体废物处理综合设备，处理能力300公斤/小时（KPTBO-300）。技术条件 TU 28.99.39-001-32382078-2018',
      fields: [
        ['批准', 'NPO Himmash 有限责任公司总经理 G. G. Gorbenko，2018年10月1日'],
        ['生效日期', '2018年10月1日'],
        ['有效期', '无期限'],
        ['编制单位', 'NPO Himmash 有限责任公司'],
        ['地点和年份', '塔甘罗格，2018年'],
      ],
      footer: 'NPO Himmash 有限责任公司财产：不得复制或转交给其他组织及个人。',
    },
    'certificate-granulation-line': {
      title: '清洗、干燥及造粒生产线符合性证书',
      kind: '符合性证书',
      header: 'ГОСТ Р 认证体系 · 俄罗斯国家标准委员会',
      heading: '符合性证书 编号 РОСС RU.АИ50.В08814',
      fields: [
        ['有效期', '2007年8月24日至2010年8月23日'],
        ['证书表格编号', '7441942'],
        ['认证机构', '注册号 РОСС RU.0001.11АИ50。自治非营利组织 Akademmash 产品认证机构。地址：莫斯科第11放射街2号213室，邮编115404'],
        ['产品', '聚烯烃清洗、干燥及造粒生产线。批量生产'],
        ['分类代码 OK 005（OKP）', '36 2710'],
        ['符合规范性文件要求', 'GOST 12.2.003-91、GOST 12.1.003-83、GOST 12.1.012-90、GOST IEC 60204-1-99'],
        ['制造商', 'Rosthimmash 有限责任公司，罗斯托夫市多瓦托拉街164/3号，邮编344090'],
        ['证书颁发对象', 'Rosthimmash 有限责任公司，罗斯托夫市多瓦托拉街164/3号，邮编344090'],
        ['颁发依据', 'GRED 有限责任公司检测中心（注册号 РОСС RU.0001.21АЮ82，有效期2007年1月25日至2010年1月25日；普斯科夫市 N. Vasilyeva 街110号，邮编180014）于2007年8月24日出具的第 156.08-07 号认证检测报告；2007年8月16日第335号生产状况分析报告'],
        ['附加信息', '符合 GOST R 50460-92 的合格标志标注于产品机身和（或）操作文件中。认证方案：3a'],
        ['签署', '认证机构负责人 I. L. Enikeev；专家 A. N. Lukyanov'],
      ],
      footer: '本证书在俄罗斯联邦全境具有法律效力。',
    },
    'specifications-granulation-line': {
      title: '聚合物造粒生产线技术条件',
      kind: '技术条件',
      header: 'OKP 362714 · G48 组',
      heading: '聚合物材料造粒生产线。技术条件 TU 3627-004-57500277-2002',
      fields: [
        ['批准', 'Rosthimmash 有限责任公司经理 G. G. Gorbenko，2002年8月'],
        ['生效日期', '2002年8月20日'],
        ['编制单位', 'Rosthimmash 有限责任公司，总设计师 A. V. Kuzmin'],
        ['登记', '俄罗斯国家标准委员会罗斯托夫标准化与计量中心：2002年8月16日登记，登记号 006433'],
      ],
    },
  },
};

export function documentText(id: string, lang: Lang): DocumentText {
  const text = texts[lang][id];
  if (!text) throw new Error(`Missing ${lang} text for document "${id}"`);
  return text;
}
