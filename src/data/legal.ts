import type { Lang } from '../i18n';

// DRAFT texts. The company replaces them with documents approved by its lawyer
// and fills the bracketed fields. Bump CONSENT_VERSION whenever the consent text changes:
// the version and date are sent with every request.
export const CONSENT_VERSION = '1.0-draft';
export const LEGAL_DATE = '2026-10-04';

export interface LegalSection { heading?: string; paragraphs?: string[]; bullets?: string[] }
export interface LegalTexts { privacy: LegalSection[]; consent: LegalSection[] }

const ru: LegalTexts = {
  privacy: [
    {
      heading: '1. Общие положения',
      paragraphs: [
        'Политика определяет порядок обработки и меры по защите персональных данных посетителей сайта химмаш24.рф. Политика принята в соответствии с Федеральным законом от 27.07.2006 № 152-ФЗ «О персональных данных».',
        'Оператор персональных данных — [полное наименование юридического лица], ИНН [ИНН], ОГРН [ОГРН], адрес: [юридический адрес с индексом] (далее — Оператор).',
      ],
    },
    {
      heading: '2. Какие данные мы обрабатываем',
      paragraphs: ['При отправке заявки через форму на сайте:'],
      bullets: [
        'имя — если посетитель его указал;',
        'номер телефона и (или) адрес электронной почты;',
        'текст обращения;',
        'технические сведения о заявке: страница, с которой она отправлена, язык сайта, дата и время отправки, отметка о согласии на обработку данных и его версия.',
      ],
    },
    {
      paragraphs: [
        'Специальные категории персональных данных и биометрические данные не обрабатываются. Сервисы веб-аналитики и cookie для отслеживания посещений на сайте не используются; при их подключении Политика будет дополнена.',
      ],
    },
    {
      heading: '3. Цели обработки',
      bullets: [
        'ответ на обращение посетителя;',
        'консультация и подбор оборудования;',
        'подготовка коммерческого предложения;',
        'заключение и исполнение договора по инициативе посетителя.',
      ],
    },
    {
      heading: '4. Правовые основания',
      paragraphs: [
        'Согласие субъекта персональных данных (п. 1 ч. 1 ст. 6 Закона № 152-ФЗ), которое оформляется отдельно при отправке заявки, а также действия по заключению договора по инициативе субъекта (п. 5 ч. 1 ст. 6 Закона № 152-ФЗ).',
      ],
    },
    {
      heading: '5. Порядок и условия обработки',
      paragraphs: [
        'Оператор осуществляет сбор, запись, систематизацию, накопление, хранение, уточнение, использование, удаление и уничтожение персональных данных с использованием средств автоматизации и без них.',
        'Запись, систематизация, накопление и хранение персональных данных граждан Российской Федерации осуществляются с использованием баз данных, находящихся на территории Российской Федерации (ч. 5 ст. 18 Закона № 152-ФЗ).',
        'Оператор не передаёт персональные данные третьим лицам, за исключением случаев, предусмотренных законодательством Российской Федерации. Трансграничная передача персональных данных не осуществляется.',
      ],
    },
    {
      heading: '6. Сроки обработки',
      paragraphs: [
        'Персональные данные обрабатываются до достижения целей обработки, но не дольше [срок, например 3 лет] с момента последнего обращения, либо до отзыва согласия. После этого данные уничтожаются в сроки, установленные ст. 21 Закона № 152-ФЗ.',
      ],
    },
    {
      heading: '7. Меры защиты',
      paragraphs: [
        'Оператор назначает лицо, ответственное за организацию обработки персональных данных, утверждает локальные акты по вопросам обработки, ограничивает доступ к данным и применяет правовые, организационные и технические меры защиты в соответствии со ст. 18.1 и 19 Закона № 152-ФЗ.',
      ],
    },
    {
      heading: '8. Права посетителя',
      paragraphs: ['Посетитель, чьи данные обрабатываются, вправе:'],
      bullets: [
        'получать сведения об обработке своих персональных данных;',
        'требовать уточнения, блокирования или уничтожения данных, если они неполные, устаревшие, неточные или не нужны для заявленной цели;',
        'отозвать согласие на обработку;',
        'обжаловать действия Оператора в Роскомнадзоре или в суде.',
      ],
    },
    {
      heading: '9. Запросы и отзыв согласия',
      paragraphs: [
        'Запрос или отзыв согласия направляется письмом на адрес [email для запросов по персональным данным] либо почтой по адресу: [почтовый адрес с индексом]. Оператор отвечает в сроки, установленные Законом № 152-ФЗ.',
      ],
    },
    {
      heading: '10. Изменение Политики',
      paragraphs: [
        'Действующая редакция Политики опубликована на этой странице. Оператор вправе вносить в неё изменения; новая редакция вступает в силу с момента публикации.',
      ],
    },
  ],
  consent: [
    {
      paragraphs: [
        'Отправляя заявку на сайте химмаш24.рф и отмечая согласие в форме, я, действуя свободно, своей волей и в своём интересе, даю [полное наименование юридического лица], ИНН [ИНН], ОГРН [ОГРН], адрес: [юридический адрес с индексом] (далее — Оператор) согласие на обработку моих персональных данных на следующих условиях.',
      ],
    },
    {
      heading: 'Персональные данные',
      paragraphs: ['Имя (если указано), номер телефона и (или) адрес электронной почты, текст обращения.'],
    },
    {
      heading: 'Цели обработки',
      paragraphs: ['Ответ на обращение, консультация по оборудованию, подготовка коммерческого предложения.'],
    },
    {
      heading: 'Действия с данными',
      paragraphs: [
        'Сбор, запись, систематизация, накопление, хранение, уточнение, использование, удаление и уничтожение — с использованием средств автоматизации и без них. Данные хранятся в базах на территории Российской Федерации. Передача третьим лицам и трансграничная передача не осуществляются.',
      ],
    },
    {
      heading: 'Срок действия и отзыв',
      paragraphs: [
        'Согласие действует до достижения целей обработки, но не дольше [срок, например 3 лет], либо до его отзыва. Отозвать согласие можно письмом на адрес [email для запросов по персональным данным] или почтой по адресу Оператора.',
        'Порядок обработки описан в Политике обработки персональных данных.',
      ],
    },
  ],
};

const en: LegalTexts = {
  privacy: [
    {
      heading: '1. General provisions',
      paragraphs: [
        'This policy sets out how the personal data of visitors to the химмаш24.рф website are processed and protected. It is adopted under Russian Federal Law No. 152-FZ of 27.07.2006 “On Personal Data”.',
        'The personal data operator is [full legal name], INN [taxpayer ID], OGRN [registration number], address: [registered address with postcode] (the “Operator”).',
      ],
    },
    {
      heading: '2. Data we process',
      paragraphs: ['When a request is sent through the website form:'],
      bullets: [
        'name, if provided;',
        'phone number and/or email address;',
        'the text of the request;',
        'technical details of the request: the page it was sent from, site language, date and time, and the consent mark with its version.',
      ],
    },
    {
      paragraphs: [
        'No special categories of personal data or biometric data are processed. The site uses no web analytics or tracking cookies; if they are added, this policy will be updated.',
      ],
    },
    {
      heading: '3. Purposes',
      bullets: [
        'replying to the visitor’s request;',
        'consultation and equipment selection;',
        'preparing a commercial proposal;',
        'concluding and performing a contract at the visitor’s initiative.',
      ],
    },
    {
      heading: '4. Legal grounds',
      paragraphs: [
        'The data subject’s consent (Art. 6(1)(1) of Law No. 152-FZ), given separately when sending a request, and steps towards concluding a contract at the data subject’s initiative (Art. 6(1)(5)).',
      ],
    },
    {
      heading: '5. How data are processed',
      paragraphs: [
        'The Operator collects, records, organises, accumulates, stores, updates, uses, deletes and destroys personal data, with and without automated means.',
        'Personal data of Russian citizens are recorded, organised, accumulated and stored in databases located in the Russian Federation (Art. 18(5) of Law No. 152-FZ).',
        'The Operator does not disclose personal data to third parties except as required by Russian law. Personal data are not transferred across borders.',
      ],
    },
    {
      heading: '6. Retention',
      paragraphs: [
        'Personal data are processed until the purposes are achieved, but no longer than [period, e.g. 3 years] after the last request, or until consent is withdrawn. The data are then destroyed within the periods set by Art. 21 of Law No. 152-FZ.',
      ],
    },
    {
      heading: '7. Security measures',
      paragraphs: [
        'The Operator appoints a person responsible for personal data processing, adopts internal policies, restricts access to the data and applies legal, organisational and technical safeguards under Arts. 18.1 and 19 of Law No. 152-FZ.',
      ],
    },
    {
      heading: '8. Your rights',
      bullets: [
        'to receive information about the processing of your personal data;',
        'to request that data be corrected, blocked or destroyed if they are incomplete, outdated, inaccurate or no longer needed;',
        'to withdraw your consent;',
        'to appeal against the Operator’s actions to Roskomnadzor or in court.',
      ],
    },
    {
      heading: '9. Requests and withdrawal of consent',
      paragraphs: [
        'Send your request or withdrawal of consent to [email for personal data requests] or by post to [postal address with postcode]. The Operator replies within the periods set by Law No. 152-FZ.',
      ],
    },
    {
      heading: '10. Changes',
      paragraphs: [
        'The current version of the policy is published on this page and takes effect on publication.',
        'This translation is provided for information; the Russian version prevails.',
      ],
    },
  ],
  consent: [
    {
      paragraphs: [
        'By sending a request on the химмаш24.рф website and ticking the consent box, I freely, of my own will and in my own interest, give [full legal name], INN [taxpayer ID], OGRN [registration number], address: [registered address with postcode] (the “Operator”) my consent to the processing of my personal data on the following terms.',
      ],
    },
    { heading: 'Personal data', paragraphs: ['Name (if provided), phone number and/or email address, the text of the request.'] },
    { heading: 'Purposes', paragraphs: ['Replying to the request, equipment consultation, preparing a commercial proposal.'] },
    {
      heading: 'Processing',
      paragraphs: [
        'Collection, recording, organisation, accumulation, storage, updating, use, deletion and destruction, with and without automated means. The data are stored in databases in the Russian Federation. They are not disclosed to third parties or transferred across borders.',
      ],
    },
    {
      heading: 'Validity and withdrawal',
      paragraphs: [
        'The consent is valid until the purposes are achieved, but no longer than [period, e.g. 3 years], or until withdrawn. It can be withdrawn by writing to [email for personal data requests] or by post to the Operator’s address.',
        'Processing is described in the Personal data processing policy. This translation is provided for information; the Russian version prevails.',
      ],
    },
  ],
};

const zh: LegalTexts = {
  privacy: [
    {
      heading: '1. 总则',
      paragraphs: [
        '本政策规定химмаш24.рф网站访客个人数据的处理方式和保护措施，依据2006年7月27日俄罗斯联邦第152-FZ号《个人数据法》制定。',
        '个人数据运营者为[公司全称]，纳税人识别号（INN）[INN]，国家注册号（OGRN）[OGRN]，地址：[含邮编的注册地址]（以下简称“运营者”）。',
      ],
    },
    {
      heading: '2. 处理的数据',
      paragraphs: ['通过网站表单提交咨询时：'],
      bullets: ['姓名（如填写）；', '电话号码和（或）电子邮箱；', '咨询内容；', '咨询的技术信息：提交页面、网站语言、提交日期和时间、同意标记及其版本。'],
    },
    { paragraphs: ['不处理特殊类别个人数据和生物识别数据。网站未使用网站分析服务和跟踪cookie；如日后启用，本政策将相应补充。'] },
    { heading: '3. 处理目的', bullets: ['答复访客咨询；', '设备咨询与选型；', '编制商业报价；', '应访客要求签订和履行合同。'] },
    { heading: '4. 法律依据', paragraphs: ['数据主体在提交咨询时单独作出的同意（第152-FZ号法第6条第1款第1项），以及应数据主体要求签订合同的行为（第6条第1款第5项）。'] },
    {
      heading: '5. 处理方式与条件',
      paragraphs: [
        '运营者以自动化和非自动化方式收集、记录、整理、积累、存储、更新、使用、删除和销毁个人数据。',
        '俄罗斯联邦公民个人数据的记录、整理、积累和存储使用位于俄罗斯联邦境内的数据库（第152-FZ号法第18条第5款）。',
        '除俄罗斯联邦法律规定的情形外，运营者不向第三方提供个人数据，也不进行跨境传输。',
      ],
    },
    { heading: '6. 保存期限', paragraphs: ['个人数据处理至目的实现为止，但自最后一次咨询起不超过[期限，例如3年]，或至撤回同意为止；此后按第152-FZ号法第21条规定的期限销毁。'] },
    { heading: '7. 保护措施', paragraphs: ['运营者指定个人数据处理负责人，制定内部制度，限制数据访问，并依据第152-FZ号法第18.1条和第19条采取法律、组织和技术保护措施。'] },
    { heading: '8. 访客的权利', bullets: ['获取其个人数据处理情况的信息；', '要求更正、封存或销毁不完整、过时、不准确或已无必要的数据；', '撤回同意；', '向俄罗斯联邦通信监管局（Roskomnadzor）或法院投诉运营者的行为。'] },
    { heading: '9. 查询与撤回同意', paragraphs: ['查询或撤回同意请发送至[个人数据查询邮箱]，或邮寄至：[含邮编的通信地址]。运营者在第152-FZ号法规定的期限内答复。'] },
    { heading: '10. 政策变更', paragraphs: ['本政策现行版本发布于本页面，自发布之日起生效。', '本译文仅供参考，以俄文版本为准。'] },
  ],
  consent: [
    { paragraphs: ['在химмаш24.рф网站提交咨询并在表单中勾选同意，即表示本人自由、自愿并为自身利益，同意[公司全称]，INN [INN]，OGRN [OGRN]，地址：[含邮编的注册地址]（以下简称“运营者”）按以下条件处理本人的个人数据。'] },
    { heading: '个人数据', paragraphs: ['姓名（如填写）、电话号码和（或）电子邮箱、咨询内容。'] },
    { heading: '处理目的', paragraphs: ['答复咨询、设备咨询、编制商业报价。'] },
    { heading: '处理行为', paragraphs: ['以自动化和非自动化方式收集、记录、整理、积累、存储、更新、使用、删除和销毁。数据存储于俄罗斯联邦境内的数据库，不向第三方提供，也不进行跨境传输。'] },
    { heading: '有效期与撤回', paragraphs: ['本同意在处理目的实现前有效，但不超过[期限，例如3年]，或至撤回为止。可发送邮件至[个人数据查询邮箱]或邮寄至运营者地址撤回同意。', '处理方式详见《个人数据处理政策》。本译文仅供参考，以俄文版本为准。'] },
  ],
};

export const legalTexts: Record<Lang, LegalTexts> = { ru, en, zh };
