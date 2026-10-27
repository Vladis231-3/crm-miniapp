import { useEffect, useState } from "react"
import type { ReactNode } from "react"

type Role = "Владелец" | "Администратор" | "Мастер" | "Клиент" | "Бухгалтер"
type Booking = {
  id: number
  client: string
  phone: string
  service: string
  master: string
  date: string
  time: string
  price: number
  status: string
  note: string
}
const today = "2026-05-18"
const services = [
  {
    name: "Стрижка и укладка",
    category: "Волосы",
    price: 3500,
    duration: 60,
    description: "Индивидуальная форма, уход и лёгкая укладка.",
  },
  {
    name: "Сложное окрашивание",
    category: "Волосы",
    price: 8500,
    duration: 180,
    description: "Многогранный цвет с бережным отношением к волосам.",
  },
  {
    name: "Маникюр с покрытием",
    category: "Ногтевой сервис",
    price: 2800,
    duration: 90,
    description: "Безупречная форма и стойкое покрытие.",
  },
  {
    name: "Уход за лицом",
    category: "Косметология",
    price: 4500,
    duration: 60,
    description: "Восстановление, увлажнение и естественное сияние.",
  },
]
const masters = ["Анна Смирнова", "Мария Иванова", "Елена Петрова", "Ольга Ким"]
const initial: Booking[] = [
  {
    id: 1,
    client: "Александра Морозова",
    phone: "+7 (916) 452-18-90",
    service: services[0].name,
    master: masters[0],
    date: today,
    time: "10:00",
    price: 3500,
    status: "Выполнена",
    note: "Предпочитает укладку без стайлинга",
  },
  {
    id: 2,
    client: "Екатерина Волкова",
    phone: "+7 (903) 234-56-78",
    service: services[1].name,
    master: masters[1],
    date: today,
    time: "11:00",
    price: 8500,
    status: "В процессе",
    note: "Аллергия на аммиак",
  },
  {
    id: 3,
    client: "Анастасия Лебедева",
    phone: "+7 (925) 765-43-21",
    service: services[2].name,
    master: masters[2],
    date: today,
    time: "11:30",
    price: 2800,
    status: "Подтверждена",
    note: "",
  },
  {
    id: 4,
    client: "Мария Соколова",
    phone: "+7 (916) 123-45-67",
    service: services[0].name,
    master: masters[0],
    date: today,
    time: "12:00",
    price: 3500,
    status: "Подтверждена",
    note: "Первое посещение — уделить время консультации",
  },
  {
    id: 5,
    client: "Полина Новикова",
    phone: "+7 (915) 890-12-34",
    service: services[3].name,
    master: masters[3],
    date: today,
    time: "13:00",
    price: 4500,
    status: "Новая",
    note: "",
  },
  {
    id: 6,
    client: "Дарья Кузнецова",
    phone: "+7 (926) 345-67-89",
    service: services[2].name,
    master: masters[2],
    date: today,
    time: "14:00",
    price: 2800,
    status: "Подтверждена",
    note: "",
  },
]
const money = (n: number) => new Intl.NumberFormat("ru-RU").format(n) + " ₽"
const navs: Record<Role, string[]> = {
  Владелец: [
    "Обзор бизнеса",
    "Аналитика",
    "Записи",
    "Клиенты",
    "Сотрудники",
    "Услуги",
    "Финансы",
    "Зарплаты",
    "Филиалы",
    "Настройки",
  ],
  Администратор: ["Записи", "Клиенты", "Сотрудники", "Услуги"],
  Мастер: ["Мой день", "История", "Мой заработок", "Профиль"],
  Клиент: ["Главная", "Мои записи", "История", "Профиль"],
  Бухгалтер: ["Финансы", "Операции", "Зарплаты", "Отчёты"],
}
const icons = [
  "grid",
  "chart",
  "calendar",
  "users",
  "team",
  "spark",
  "wallet",
  "receipt",
  "pin",
  "settings",
]
function Icon({ name = "grid", size = 20 }: { name?: string; size?: number }) {
  const paths: Record<string, ReactNode> = {
    grid: (
      <>
        <rect x="3" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="3" width="7" height="7" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" />
        <rect x="14" y="14" width="7" height="7" rx="1.5" />
      </>
    ),
    chart: (
      <>
        <path d="M4 3v17h17M8 15l4-5 4 3 5-7" />
      </>
    ),
    calendar: (
      <>
        <rect x="3" y="5" width="18" height="16" rx="3" />
        <path d="M7 3v4m10-4v4M3 11h18m-13 4h2m4 0h2" />
      </>
    ),
    users: (
      <>
        <circle cx="9" cy="8" r="3" />
        <path d="M3 21v-3a6 6 0 0 1 12 0v3m1-16a3 3 0 0 1 0 6m2 4a5 5 0 0 1 3 5" />
      </>
    ),
    team: (
      <>
        <circle cx="12" cy="7" r="3" />
        <path d="M6 21v-4a6 6 0 0 1 12 0v4M3 8v5m18-5v5" />
      </>
    ),
    spark: <path d="m12 2 3 7 7 3-7 3-3 7-3-7-7-3 7-3Z" />,
    wallet: (
      <>
        <rect x="3" y="5" width="18" height="15" rx="3" />
        <path d="M16 10h5v6h-5a3 3 0 0 1 0-6ZM4 5l12-3" />
      </>
    ),
    receipt: (
      <>
        <path d="M5 3h14v19l-4-2-3 2-3-2-4 2ZM9 8h6m-6 4h6m-6 4h3" />
      </>
    ),
    pin: (
      <>
        <path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 0 1 14 0Z" />
        <circle cx="12" cy="10" r="2" />
      </>
    ),
    settings: (
      <>
        <circle cx="12" cy="12" r="4" />
        <path d="m9 3-1 3-3 1-2 5 3 2 1 4 5 3 3-3 4-1 2-5-3-3-1-4Z" />
      </>
    ),
    search: (
      <>
        <circle cx="10.5" cy="10.5" r="6.5" />
        <path d="m16 16 5 5" />
      </>
    ),
    bell: (
      <>
        <path d="M5 16h14l-2-4V8A5 5 0 0 0 7 8v4Zm5 4h4" />
      </>
    ),
    plus: <path d="M12 5v14M5 12h14" />,
    arrow: <path d="M5 12h14m-5-5 5 5-5 5" />,
    chevron: <path d="m8 10 4 4 4-4" />,
    up: <path d="m5 16 6-6 4 3 5-8m-6 0h6v6" />,
    close: <path d="m6 6 12 12M6 18 18 6" />,
    check: <path d="m5 12 4 4L19 6" />,
    download: <path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5" />,
    clock: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </>
    ),
    help: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M9 9a3 3 0 1 1 5 2c-2 1-2 2-2 3m0 3h.01" />
      </>
    ),
  }
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.65"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name] || paths.grid}
    </svg>
  )
}
function Avatar({ name, small = false }: { name: string; small?: boolean }) {
  return (
    <span className={`avatar ${small ? "small" : ""} color-${name.length % 4}`}>
      {name
        .split(" ")
        .map((x) => x[0])
        .slice(0, 2)
        .join("")}
    </span>
  )
}
function Status({ value }: { value: string }) {
  return (
    <span className={`status status-${value.replace(/ /g, "-")}`}>
      <i />
      {value}
    </span>
  )
}
function Modal({
  title,
  children,
  close,
}: {
  title: string
  children: ReactNode
  close: () => void
}) {
  return (
    <div
      className="overlay"
      onMouseDown={(e) => e.target === e.currentTarget && close()}
    >
      <section
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="modal-head">
          <h2>{title}</h2>
          <button className="icon-button" onClick={close} aria-label="Закрыть">
            <Icon name="close" />
          </button>
        </div>
        {children}
      </section>
    </div>
  )
}

export default function App() {
  const [role, setRole] = useState<Role>("Владелец")
  const [page, setPage] = useState("Обзор бизнеса")
  const [bookings, setBookings] = useState<Booking[]>(() => {
    try {
      return (
        JSON.parse(localStorage.getItem("atmosfera-bookings") || "null") ||
        initial
      )
    } catch {
      return initial
    }
  })
  const [query, setQuery] = useState("")
  const [period, setPeriod] = useState("Месяц")
  const [branch, setBranch] = useState("Все филиалы")
  const [toast, setToast] = useState("")
  const [modal, setModal] = useState("")
  const [selected, setSelected] = useState<Booking | null>(null)
  const [filter, setFilter] = useState("Все статусы")
  const [view, setView] = useState("День")
  const [date, setDate] = useState(today)
  const [step, setStep] = useState(0)
  const [category, setCategory] = useState("Волосы")
  const [service, setService] = useState(services[0].name)
  const [master, setMaster] = useState(masters[0])
  const [time, setTime] = useState("15:00")
  const [client, setClient] = useState("Мария Соколова")
  const [phone, setPhone] = useState("+7 (916) 123-45-67")
  const [note, setNote] = useState("")
  const [error, setError] = useState("")
  const [paid, setPaid] = useState<string[]>([])
  const [payReady, setPayReady] = useState<string[]>([])
  const [extraClients, setExtraClients] = useState<{
    client: string
    phone: string
  }[]>([])
  const [confirmDeleteClient, setConfirmDeleteClient] = useState(false)
  const [menu, setMenu] = useState(false)
  useEffect(() => {
    localStorage.setItem("atmosfera-bookings", JSON.stringify(bookings))
  }, [bookings])
  useEffect(() => {
    setConfirmDeleteClient(false)
  }, [modal, client])
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(""), 4000)
      return () => clearTimeout(timer)
    }
  }, [toast])
  useEffect(() => {
    const listener = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setModal("")
        setSelected(null)
      }
    }
    window.addEventListener("keydown", listener)
    return () => window.removeEventListener("keydown", listener)
  }, [])
  const notify = (text: string) => setToast(text)
  const navigate = (p: string) => {
    setPage(p)
    setQuery("")
    setMenu(false)
    setFilter("Все статусы")
  }
  const mobileRole = role === "Клиент" || role === "Мастер"
  const mine = bookings.filter((b) =>
    role === "Мастер"
      ? b.master === masters[0]
      : role === "Клиент"
        ? b.client === "Мария Соколова"
        : true,
  )
  const filtered = mine.filter(
    (b) =>
      (b.client + b.phone + b.service + b.master)
        .toLowerCase()
        .includes(query.toLowerCase()) &&
      (filter === "Все статусы" || b.status === filter),
  )
  const completed = bookings.filter((b) => b.status === "Выполнена")
  const dayRevenue = completed.reduce((s, b) => s + b.price, 0)
  const historicalRevenue = 1244500
  const revenue =
    period === "День"
      ? dayRevenue
      : period === "Неделя"
        ? 286500 + dayRevenue
        : historicalRevenue + dayRevenue
  const currentService = services.find((s) => s.name === service)!
  const canCreate =
    role === "Владелец" || role === "Администратор" || role === "Клиент"
  const clientVisitCount = bookings.filter((b) => b.client === client).length
  function openBooking() {
    setStep(0)
    setDate(today)
    setError("")
    setModal("booking")
  }
  function saveBooking() {
    if (!client.trim() || phone.replace(/\D/g, "").length < 10) {
      setError("Укажите имя и корректный номер телефона.")
      return
    }
    if (
      bookings.some(
        (b) =>
          b.master === master &&
          b.date === date &&
          b.time === time &&
          !["Отменена", "Не приехал"].includes(b.status),
      )
    ) {
      setError("Это время уже занято. Выберите другой слот.")
      return
    }
    const b: Booking = {
      id: Date.now(),
      client,
      phone,
      service,
      master,
      date,
      time,
      price: currentService.price,
      status: "Новая",
      note,
    }
    setBookings((prev) => [...prev, b])
    setStep(5)
    notify("Запись создана и добавлена в расписание")
  }
  function updateStatus(status: string) {
    if (!selected) return
    if (
      ["Отменена", "Не приехал"].includes(status) &&
      !window.confirm(
        `Изменить статус на «${status}»? Событие останется в истории.`,
      )
    )
      return
    setBookings((prev) =>
      prev.map((b) => (b.id === selected.id ? { ...b, status } : b)),
    )
    setSelected({ ...selected, status })
    notify("Статус записи обновлён")
  }
  function deleteClientCard() {
    const removedBookings = bookings.filter((b) => b.client === client).length
    setBookings((prev) => prev.filter((b) => b.client !== client))
    setExtraClients((prev) => prev.filter((c) => c.client !== client))
    setSelected(null)
    setModal("")
    setClient("")
    setPhone("")
    notify(
      removedBookings
        ? `Клиент удалён. Удалено записей: ${removedBookings}`
        : "Клиент удалён",
    )
  }
  function exportCSV() {
    const rows = [
      "Дата;Клиент;Услуга;Мастер;Сумма;Статус",
      ...bookings.map(
        (b) =>
          `${b.date};${b.client};${b.service};${b.master};${b.price};${b.status}`,
      ),
    ]
    const url = URL.createObjectURL(
      new Blob(["\uFEFF" + rows.join("\n")], {
        type: "text/csv;charset=utf-8;",
      }),
    )
    const a = document.createElement("a")
    a.href = url
    a.download = "Атмосфера-отчёт.csv"
    a.click()
    URL.revokeObjectURL(url)
    notify("Отчёт CSV экспортирован")
  }
  const bookingTable = (items: Booking[], compact = false) => (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            <th>Клиент</th>
            <th>Услуга / Мастер</th>
            <th>Время</th>
            <th>Стоимость</th>
            <th>Статус</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {items.map((b) => (
            <tr
              key={b.id}
              onClick={() => setSelected(b)}
              tabIndex={0}
              onKeyDown={(e) => e.key === "Enter" && setSelected(b)}
            >
              <td>
                <div className="person">
                  <Avatar name={b.client} />
                  <div>
                    <strong>{b.client}</strong>
                    <small>{b.phone}</small>
                  </div>
                </div>
              </td>
              <td>
                <strong>{b.service}</strong>
                <small>{b.master}</small>
              </td>
              <td>
                <strong>{b.time}</strong>
                <small>
                  {compact
                    ? "Сегодня"
                    : new Date(b.date).toLocaleDateString("ru-RU")}
                </small>
              </td>
              <td className="amount">{money(b.price)}</td>
              <td>
                <Status value={b.status} />
              </td>
              <td>
                <Icon name="arrow" size={17} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {!items.length && (
        <div className="empty">
          <Icon name="calendar" size={32} />
          <h3>Пока нет записей</h3>
          <p>Измените фильтры или создайте новую запись.</p>
        </div>
      )}
    </div>
  )
  const metrics = (finance = false) => (
    <div className="metrics">
      {(finance
        ? [
            {
              label: "Выручка",
              value: revenue,
              change: "+18,6%",
              detail: "к предыдущему периоду",
              icon: "wallet",
            },
            {
              label: "Расходы",
              value: 386000,
              change: "−4,2%",
              detail: "без фонда оплаты труда",
              icon: "receipt",
            },
            {
              label: "Фонд оплаты труда",
              value: 312000 + dayRevenue * 0.4,
              change: "40%",
              detail: "от выполненных услуг",
              icon: "users",
            },
            {
              label: "Чистая прибыль",
              value: revenue - 386000 - 312000 - dayRevenue * 0.4,
              change: "+24,8%",
              detail: "выручка минус расходы и ФОТ",
              icon: "chart",
            },
          ]
        : [
            {
              label: "Выручка",
              value: revenue,
              change: "+18,6%",
              detail: "к прошлому месяцу",
              icon: "wallet",
            },
            {
              label: "Записи",
              value: 382 + bookings.length,
              change: "+12,4%",
              detail: `${342 + completed.length} выполнено · 18 отменено`,
              icon: "calendar",
            },
            {
              label: "Средний чек",
              value: Math.round(revenue / (342 + completed.length)),
              change: "+5,5%",
              detail: "к прошлому месяцу",
              icon: "receipt",
            },
            {
              label: "Загрузка мастеров",
              value: 78,
              change: "+8 п. п.",
              detail: "из доступного времени",
              icon: "team",
            },
          ]
      ).map((m, i) => (
        <section
          key={m.label}
          className={`metric ${i === 0 ? "featured" : ""}`}
        >
          <div className="metric-top">
            <span>{m.label}</span>
            <Icon name={m.icon} size={18} />
          </div>
          <div className="metric-value">
            {!finance && i === 1
              ? m.value
              : !finance && i === 3
                ? `${m.value}%`
                : money(m.value)}
          </div>
          <div className="metric-bottom">
            <span className="growth">
              <Icon name="up" size={13} />
              {m.change}
            </span>
            <span>{m.detail}</span>
          </div>
          {i === 0 && (
            <svg className="mini-chart" viewBox="0 0 170 40">
              <path
                d="m0 35 15-8 10 4 15-12 15 7 15-9 15 4 15-15 12 3 15-8 15 5 18-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              />
            </svg>
          )}
        </section>
      ))}
    </div>
  )
  const chart = (
    <section className="panel revenue-panel">
      <div className="panel-heading">
        <div>
          <h2>
            Динамика выручки{" "}
            <span className="subtle-pill">
              +18,6% <Icon name="up" size={12} />
            </span>
          </h2>
          <p>Бизнес растёт. Так держать!</p>
        </div>
        <div className="segmented">
          {["День", "Неделя", "Месяц"].map((p) => (
            <button
              className={period === p ? "active" : ""}
              key={p}
              onClick={() => setPeriod(p)}
            >
              {p}
            </button>
          ))}
        </div>
      </div>
      <div className="chart-legend">
        <span>
          <i className="dot green" />
          Текущий период
        </span>
        <span>
          <i className="dot gray" />
          Предыдущий период
        </span>
        <strong>{money(revenue)}</strong>
      </div>
      <div className="chart">
        <div className="y-labels">
          {["100 тыс.", "75 тыс.", "50 тыс.", "25 тыс.", "0"].map((x) => (
            <span key={x}>{x}</span>
          ))}
        </div>
        <div className="graph-area">
          <div className="chart-grid" />
          <svg
            viewBox="0 0 800 200"
            preserveAspectRatio="none"
            role="img"
            aria-label={`Выручка за период ${period}: ${money(revenue)}`}
          >
            <defs>
              <linearGradient id="area" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0" stopColor="#44a186" stopOpacity=".18" />
                <stop offset="1" stopColor="#44a186" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path
              d="M0 173C25 173 25 140 53 143S90 174 118 150 150 110 180 126 215 153 243 126 270 140 300 108 330 104 360 116 400 92 425 104 460 129 488 90 520 79 545 96 580 75 610 55 640 73 672 48 700 70 739 40 770 48 800 14V200H0Z"
              fill="url(#area)"
            />
            <path
              d="M0 179C30 161 37 172 60 159S95 184 125 170 156 141 184 158 215 166 243 147 270 166 305 142 335 151 365 130 400 150 430 128 460 152 490 124 525 145 550 115 580 137 615 117 640 129 675 109 700 130 740 104 770 125 800 104"
              fill="none"
              stroke="#c6cfca"
              strokeWidth="2"
              strokeDasharray="5 5"
            />
            <path
              d={
                period === "День"
                  ? "M0 180H180L190 150H400L410 110H600L610 65H800"
                  : "M0 173C25 173 25 140 53 143S90 174 118 150 150 110 180 126 215 153 243 126 270 140 300 108 330 104 360 116 400 92 425 104 460 129 488 90 520 79 545 96 580 75 610 55 640 73 672 48 700 70 739 40 770 48 800 14"
              }
              fill="none"
              stroke="#31836c"
              strokeWidth="3"
            />
          </svg>
          <div className="x-labels">
            {(period === "День"
              ? ["09:00", "11:00", "13:00", "15:00", "17:00", "19:00"]
              : period === "Неделя"
                ? ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"]
                : [
                    "1 мая",
                    "5 мая",
                    "10 мая",
                    "15 мая",
                    "20 мая",
                    "25 мая",
                    "31 мая",
                  ]
            ).map((x) => (
              <span key={x}>{x}</span>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
  function renderPage() {
    if (page === "Обзор бизнеса" || page === "Аналитика")
      return (
        <>
          {metrics()}
          <div className="analytics-grid">
            {chart}
            <section className="panel structure">
              <div className="panel-heading">
                <h2>Структура доходов</h2>
                <span className="muted">Май</span>
              </div>
              <div className="donut">
                <div>
                  <small>Общая выручка</small>
                  <strong>
                    {(revenue / 1000000).toFixed(2).replace(".", ",")} млн ₽
                  </strong>
                  <span>4 категории услуг</span>
                </div>
              </div>
              <div className="category-list">
                {[
                  ["Волосы", "52%", "green"],
                  ["Ногтевой сервис", "28%", "sage"],
                  ["Косметология", "15%", "lime"],
                  ["Другие услуги", "5%", "gray"],
                ].map(([n, v, c]) => (
                  <div key={n}>
                    <span>
                      <i className={`dot ${c}`} />
                      {n}
                    </span>
                    <strong>{v}</strong>
                  </div>
                ))}
              </div>
            </section>
          </div>
          <div className="section-title">
            <h2>
              Сегодня в Атмосфере{" "}
              <span className="count">{bookings.length}</span>
            </h2>
            <button className="text-button" onClick={() => navigate("Записи")}>
              Все записи <Icon name="arrow" size={16} />
            </button>
          </div>
          <section className="panel">
            {bookingTable(bookings.slice(0, 4), true)}
          </section>
          <div className="bottom-grid">
            <section className="panel">
              <div className="panel-heading">
                <h2>Команда в ритме</h2>
                <button
                  className="text-button"
                  onClick={() => navigate("Сотрудники")}
                >
                  Все сотрудники <Icon name="arrow" size={15} />
                </button>
              </div>
              <div className="team-inline">
                {masters.map((m, i) => (
                  <div key={m}>
                    <Avatar name={m} />
                    <strong>{m}</strong>
                    <small>{[86, 78, 92, 64][i]}% загрузка</small>
                    <div className="progress">
                      <i style={{ width: `${[86, 78, 92, 64][i]}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </section>
            <section className="attention">
              <div className="attention-icon">
                <Icon name="bell" />
              </div>
              <div>
                <h3>Немного внимания — и всё в порядке</h3>
                <p>
                  {bookings.filter((b) => b.status === "Новая").length} запись
                  ожидает подтверждения.
                  <br />
                  Помогите клиентам спланировать свой день.
                </p>
                <button
                  className="text-button"
                  onClick={() => {
                    navigate("Записи")
                    setFilter("Новая")
                  }}
                >
                  Посмотреть записи <Icon name="arrow" size={15} />
                </button>
              </div>
            </section>
          </div>
        </>
      )
    if (["Записи", "Мой день", "Мои записи", "История"].includes(page)) {
      const items = filtered.filter((b) =>
        page === "История"
          ? ["Выполнена", "Отменена", "Не приехал"].includes(b.status)
          : page === "Мои записи"
            ? !["Выполнена", "Отменена"].includes(b.status)
            : view === "Неделя"
              ? true
              : b.date === date,
      )
      return (
        <>
          <div className="toolbar">
            <div className="segmented">
              {["День", "Неделя", "Список"].map((v) => (
                <button
                  key={v}
                  className={view === v ? "active" : ""}
                  onClick={() => setView(v)}
                >
                  {v}
                </button>
              ))}
            </div>
            <input
              aria-label="Дата расписания"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
            <select value={filter} onChange={(e) => setFilter(e.target.value)}>
              <option>Все статусы</option>
              {[
                "Новая",
                "Подтверждена",
                "В процессе",
                "Выполнена",
                "Отменена",
                "Не приехал",
              ].map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </div>
          {role === "Мастер" && (
            <div className="personal-banner">
              <div>
                <small>ВАШ ДЕНЬ В ЦИФРАХ</small>
                <h2>
                  {items.length} записи · {items.length * 60} минут
                </h2>
              </div>
              <div>
                <small>Вознаграждение за выполненные услуги</small>
                <h2>
                  {money(
                    mine
                      .filter((b) => b.status === "Выполнена")
                      .reduce((s, b) => s + b.price * 0.4, 0),
                  )}
                </h2>
              </div>
            </div>
          )}
          {view !== "Список" && !mobileRole ? (
            <section className="panel calendar-board">
              <div className="calendar-columns">
                <div>Время</div>
                {masters.map((m) => (
                  <div key={m}>
                    <Avatar name={m} small />
                    <strong>{m}</strong>
                  </div>
                ))}
              </div>
              {[
                "09:00",
                "10:00",
                "11:00",
                "12:00",
                "13:00",
                "14:00",
                "15:00",
                "16:00",
                "17:00",
              ].map((t) => (
                <div className="calendar-row" key={t}>
                  <span>{t}</span>
                  {masters.map((m) => (
                    <div key={m}>
                      {items
                        .filter(
                          (b) =>
                            b.master === m &&
                            b.time.slice(0, 2) === t.slice(0, 2),
                        )
                        .map((b) => (
                          <button
                            className={`calendar-booking ${
                              b.status === "Выполнена" ? "done" : ""
                            }`}
                            key={b.id}
                            onClick={() => setSelected(b)}
                          >
                            <small>
                              {b.time} · {money(b.price)}
                            </small>
                            <strong>{b.client}</strong>
                            <span>{b.service}</span>
                            <Status value={b.status} />
                          </button>
                        ))}
                    </div>
                  ))}
                </div>
              ))}
            </section>
          ) : mobileRole ? (
            <div className="booking-cards">
              {items.map((b) => (
                <button
                  key={b.id}
                  className="panel booking-card"
                  onClick={() => setSelected(b)}
                >
                  <div>
                    <span className="booking-time">{b.time}</span>
                    <Status value={b.status} />
                  </div>
                  <h2>{b.service}</h2>
                  <p>{role === "Клиент" ? b.master : b.client}</p>
                  <div className="booking-card-footer">
                    <span>
                      {new Date(b.date).toLocaleDateString("ru-RU")} · 60 мин
                    </span>
                    <strong>{money(b.price)}</strong>
                    <Icon name="arrow" />
                  </div>
                </button>
              ))}
              {!items.length && (
                <div className="empty">
                  <h2>Здесь пока тихо</h2>
                  <p>Новые записи появятся здесь.</p>
                  {canCreate && (
                    <button className="primary" onClick={openBooking}>
                      Записаться
                    </button>
                  )}
                </div>
              )}
            </div>
          ) : (
            <section className="panel">{bookingTable(items)}</section>
          )}
        </>
      )
    }
    if (page === "Главная")
      return (
        <>
          <section className="client-hero">
            <span className="eyebrow">ВРЕМЯ ДЛЯ СЕБЯ</span>
            <h2>
              Красота начинается
              <br />с хорошего настроения.
            </h2>
            <p>А мы позаботимся об остальном.</p>
            <button className="primary" onClick={openBooking}>
              Выбрать услугу <Icon name="arrow" />
            </button>
            <div className="hero-orbit" />
          </section>
          <div className="section-title">
            <h2>Ваша ближайшая запись</h2>
          </div>
          {mine
            .filter((b) => !["Выполнена", "Отменена"].includes(b.status))
            .slice(0, 1)
            .map((b) => (
              <button
                key={b.id}
                className="panel next-booking"
                onClick={() => setSelected(b)}
              >
                <Icon name="calendar" size={28} />
                <div>
                  <h2>{b.service}</h2>
                  <p>
                    18 мая · {b.time} · {b.master}
                  </p>
                </div>
                <Icon name="arrow" />
              </button>
            ))}
          <div className="section-title">
            <h2>Найдите своё настроение</h2>
          </div>
          <div className="service-grid">
            {services.map((s, i) => (
              <button
                className={`panel service-card service-${i}`}
                key={s.name}
                onClick={() => {
                  setCategory(s.category)
                  setService(s.name)
                  setStep(2)
                  setModal("booking")
                }}
              >
                <span className="service-symbol">
                  <Icon
                    name={
                      i === 0
                        ? "spark"
                        : i === 1
                          ? "chart"
                          : i === 2
                            ? "grid"
                            : "pin"
                    }
                    size={32}
                  />
                </span>
                <small>{s.category}</small>
                <h2>{s.name}</h2>
                <p>{s.description}</p>
                <strong>
                  {money(s.price)} <span> / {s.duration} мин</span>
                </strong>
                <Icon name="arrow" />
              </button>
            ))}
          </div>
        </>
      )
    if (page === "Клиенты") {
      const clients = [
        ...new Map(
          [...bookings, ...extraClients].map((b) => [b.client, b]),
        ).values(),
      ].filter((c) =>
        (c.client + c.phone).toLowerCase().includes(query.toLowerCase()),
      )
      return (
        <>
          <div className="toolbar">
            <span className="muted">{clients.length} клиентов в базе</span>
            <button
              className="primary"
              onClick={() => {
                setClient("")
                setPhone("")
                setModal("client")
              }}
            >
              <Icon name="plus" size={16} />
              Добавить клиента
            </button>
          </div>
          <section className="panel">
            <div className="client-list">
              {clients.map((c) => (
                <button
                  key={c.client}
                  onClick={() => {
                    setClient(c.client)
                    setPhone(c.phone)
                    setModal("client-detail")
                  }}
                >
                  <Avatar name={c.client} />
                  <div>
                    <strong>{c.client}</strong>
                    <small>{c.phone}</small>
                  </div>
                  <span>
                    {bookings.filter((b) => b.client === c.client).length}{" "}
                    посещений
                  </span>
                  <Icon name="arrow" />
                </button>
              ))}
            </div>
            {!clients.length && <div className="empty">Клиенты не найдены</div>}
          </section>
        </>
      )
    }
    if (page === "Сотрудники")
      return (
        <div className="staff-grid">
          {masters.map((m, i) => (
            <section className="panel staff-card" key={m}>
              <Avatar name={m} />
              <h2>{m}</h2>
              <p>
                {
                  [
                    "Стилист · колорист",
                    "Стилист · колорист",
                    "Мастер маникюра",
                    "Косметолог",
                  ][i]
                }
              </p>
              <Status value="На смене" />
              <div className="staff-stats">
                <div>
                  <strong>
                    {bookings.filter((b) => b.master === m).length}
                  </strong>
                  <small>Записей сегодня</small>
                </div>
                <div>
                  <strong>{[86, 78, 92, 64][i]}%</strong>
                  <small>Загрузка</small>
                </div>
              </div>
              <button
                className="secondary"
                onClick={() => {
                  setMaster(m)
                  setModal("schedule")
                }}
              >
                Расписание и профиль <Icon name="arrow" size={16} />
              </button>
            </section>
          ))}
        </div>
      )
    if (page === "Услуги")
      return (
        <>
          <div className="toolbar">
            <span className="muted">Каталог услуг · 3 категории</span>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              {[
                "Все категории",
                "Волосы",
                "Ногтевой сервис",
                "Косметология",
              ].map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </div>
          <div className="service-grid">
            {services
              .filter(
                (s) => category === "Все категории" || s.category === category,
              )
              .map((s) => (
                <section className="panel service-card" key={s.name}>
                  <span className="service-symbol">
                    <Icon name="spark" size={30} />
                  </span>
                  <small>{s.category}</small>
                  <h2>{s.name}</h2>
                  <p>{s.description}</p>
                  <strong>
                    {money(s.price)} <span> / {s.duration} мин</span>
                  </strong>
                  <button
                    className="text-button"
                    onClick={() => {
                      setService(s.name)
                      setStep(2)
                      setModal("booking")
                    }}
                  >
                    Создать запись <Icon name="arrow" size={16} />
                  </button>
                </section>
              ))}
          </div>
        </>
      )
    if (["Финансы", "Операции", "Отчёты"].includes(page))
      return (
        <>
          {metrics(true)}
          <div className="toolbar">
            <div className="segmented">
              {["День", "Неделя", "Месяц"].map((p) => (
                <button
                  key={p}
                  className={period === p ? "active" : ""}
                  onClick={() => setPeriod(p)}
                >
                  {p}
                </button>
              ))}
            </div>
            <button className="secondary" onClick={exportCSV}>
              <Icon name="download" size={17} />
              Экспорт CSV
            </button>
          </div>
          {page !== "Операции" && chart}
          <div className="section-title">
            <h2>Журнал операций</h2>
            <span className="muted">Только проведённые платежи</span>
          </div>
          <section className="panel">
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Дата</th>
                    <th>Операция</th>
                    <th>Категория</th>
                    <th>Сумма</th>
                    <th>Статус</th>
                  </tr>
                </thead>
                <tbody>
                  {completed.map((b) => (
                    <tr key={b.id}>
                      <td>{b.date.split("-").reverse().join(".")}</td>
                      <td>
                        <strong>{b.client}</strong>
                        <small>{b.service}</small>
                      </td>
                      <td>Оплата услуги</td>
                      <td className="positive">+{money(b.price)}</td>
                      <td>
                        <Status value="Проведено" />
                      </td>
                    </tr>
                  ))}
                  <tr>
                    <td>01.05.2026</td>
                    <td>
                      <strong>Аренда пространства</strong>
                      <small>Атмосфера · Центр</small>
                    </td>
                    <td>Аренда</td>
                    <td>−180 000 ₽</td>
                    <td>
                      <Status value="Проведено" />
                    </td>
                  </tr>
                  <tr>
                    <td>05.05.2026</td>
                    <td>
                      <strong>Материалы и косметика</strong>
                    </td>
                    <td>Расходные материалы</td>
                    <td>−126 000 ₽</td>
                    <td>
                      <Status value="Проведено" />
                    </td>
                  </tr>
                  <tr>
                    <td>10.05.2026</td>
                    <td>
                      <strong>Продвижение и сервисы</strong>
                    </td>
                    <td>Операционные расходы</td>
                    <td>−80 000 ₽</td>
                    <td>
                      <Status value="Проведено" />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
          <p className="footnote">
            Демонстрационный период: май 2026. Входящий остаток выручки — 1 244
            500 ₽; ФОТ — 312 000 ₽. Новые выполненные услуги добавляются к
            показателям один раз.
          </p>
        </>
      )
    if (page === "Зарплаты" || page === "Мой заработок")
      return (
        <>
          <div className="personal-banner">
            <div>
              <small>РАСЧЁТНЫЙ ПЕРИОД</small>
              <h2>Май 2026</h2>
              <p>Фиксированная часть + 40% от выполненных услуг</p>
            </div>
            <Icon name="wallet" size={40} />
          </div>
          <section className="panel">
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Сотрудник</th>
                    <th>Фиксированная часть</th>
                    <th>Услуги / 40%</th>
                    <th>Начислено</th>
                    <th>Статус</th>
                    {role !== "Мастер" && <th>Действие</th>}
                  </tr>
                </thead>
                <tbody>
                  {(role === "Мастер" ? [masters[0]] : masters).map((m) => {
                    const sum = completed
                      .filter((b) => b.master === m)
                      .reduce((s, b) => s + b.price, 0)
                    return (
                      <tr key={m}>
                        <td>
                          <div className="person">
                            <Avatar name={m} />
                            <strong>{m}</strong>
                          </div>
                        </td>
                        <td>30 000 ₽</td>
                        <td>
                          <strong>{money(sum)} × 40%</strong>
                          <small>{money(sum * 0.4)}</small>
                        </td>
                        <td className="amount">{money(30000 + sum * 0.4)}</td>
                        <td>
                          <Status
                            value={
                              paid.includes(m)
                                ? "Выплачено"
                                : payReady.includes(m)
                                  ? "К выплате"
                                  : "Начислено"
                            }
                          />
                        </td>
                        {role !== "Мастер" && (
                          <td>
                            <button
                              disabled={paid.includes(m)}
                              className="secondary"
                              onClick={() => {
                                if (!payReady.includes(m)) {
                                  setPayReady([...payReady, m])
                                  notify("Начисление готово к выплате")
                                } else if (
                                  window.confirm(
                                    `Подтвердить выплату ${money(30000 + sum * 0.4)} сотруднику ${m}?`,
                                  )
                                ) {
                                  setPaid([...paid, m])
                                  notify("Выплата зарегистрирована")
                                }
                              }}
                            >
                              {paid.includes(m)
                                ? "Выплачено"
                                : payReady.includes(m)
                                  ? "Выплатить"
                                  : "К выплате"}
                            </button>
                          </td>
                        )}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </section>
          <p className="footnote">
            Расчёт новой ведомости: 30 000 ₽ + сумма выполненных услуг × 40%.
            Исторический ФОТ в обзоре учитывается отдельно.
          </p>
        </>
      )
    if (page === "Филиалы")
      return (
        <div className="staff-grid">
          {["Атмосфера · Центр", "Атмосфера · Патриаршие"].map((n, i) => (
            <section className="panel location-card" key={n}>
              <div className="map-abstract">
                <Icon name="pin" size={40} />
                <span>{i === 0 ? "ЦЕНТР" : "ПАТРИАРШИЕ"}</span>
              </div>
              <h2>{n}</h2>
              <p>
                {i === 0
                  ? "Москва, ул. Большая Дмитровка, 12"
                  : "Москва, Малая Бронная, 24"}
              </p>
              <Status value="Открыт" />
              <p>Ежедневно · 09:00–21:00</p>
              <button
                className="secondary"
                onClick={() => {
                  setBranch(n)
                  navigate("Записи")
                }}
              >
                Открыть расписание <Icon name="arrow" size={16} />
              </button>
            </section>
          ))}
        </div>
      )
    if (page === "Настройки" || page === "Профиль")
      return (
        <section className="panel settings-panel">
          <h2>{page === "Профиль" ? "Личные данные" : "Настройки компании"}</h2>
          <p className="muted">Контактная информация и предпочтения</p>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              notify("Изменения сохранены")
            }}
          >
            <label>
              {page === "Настройки" ? "Название компании" : "Имя и фамилия"}
              <input
                required
                defaultValue={
                  page === "Настройки"
                    ? "Атмосфера"
                    : role === "Мастер"
                      ? masters[0]
                      : "Мария Соколова"
                }
              />
            </label>
            <label>
              Телефон
              <input required type="tel" defaultValue="+7 (916) 123-45-67" />
            </label>
            <label>
              Электронная почта
              <input required type="email" defaultValue="hello@atmosfera.ru" />
            </label>
            <label className="checkbox">
              <input type="checkbox" defaultChecked />
              Уведомления о записях
            </label>
            <label className="checkbox">
              <input type="checkbox" defaultChecked />
              Напоминания за день до визита
            </label>
            <button className="primary" type="submit">
              Сохранить изменения
            </button>
          </form>
          {page === "Настройки" && (
            <div className="permissions">
              <h3>Пользователи и права</h3>
              {Object.entries(navs).map(([r, pages]) => (
                <div key={r}>
                  <strong>{r}</strong>
                  <span>{pages.length} доступных раздела</span>
                </div>
              ))}
            </div>
          )}
        </section>
      )
    return null
  }
  return (
    <div className={`app ${mobileRole ? "personal-app" : ""}`}>
      <aside className={`sidebar ${menu ? "open" : ""}`}>
        <div className="brand">
          <span className="brand-mark">
            <i />
            <i />
            <i />
          </span>
          <span>
            atmosfera<span className="brand-period">.</span>
            <small>ПРОСТРАНСТВО ДЛЯ РОСТА</small>
          </span>
        </div>
        <button className="workspace" onClick={() => setModal("workspace")}>
          <span className="workspace-logo">а</span>
          <span>
            <strong>Атмосфера</strong>
            <small>Сеть салонов красоты</small>
          </span>
          <Icon name="chevron" size={16} />
        </button>
        <div className="nav-label">РАБОЧЕЕ ПРОСТРАНСТВО</div>
        <nav>
          {navs[role].map((n, i) => (
            <button
              key={n}
              className={page === n ? "nav-item active" : "nav-item"}
              onClick={() => navigate(n)}
            >
              <Icon name={icons[navs.Владелец.indexOf(n)] || icons[i]} />
              <span>{n}</span>
              {n === "Записи" && (
                <span className="nav-count">{bookings.length}</span>
              )}
              {n === "Обзор бизнеса" && <span className="active-dot" />}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="help-box">
            <span className="help-circle">
              <Icon name="spark" size={18} />
            </span>
            <h3>Больше возможностей</h3>
            <p>
              Освободите время для того,
              <br />
              что действительно важно.
            </p>
            <button onClick={() => setModal("help")}>
              Познакомиться поближе <Icon name="arrow" size={15} />
            </button>
          </div>
          <button className="support" onClick={() => setModal("help")}>
            <Icon name="help" size={18} />
            Помощь и поддержка
            <Icon name="arrow" size={15} />
          </button>
          <div className="role-switch">
            <span className="demo-dot" />
            ДЕМО · ВАША РОЛЬ
            <select
              aria-label="Переключить роль"
              value={role}
              onChange={(e) => {
                const r = e.target.value as Role
                setRole(r)
                navigate(navs[r][0])
                setSelected(null)
                setModal("")
              }}
            >
              {Object.keys(navs).map((r) => (
                <option key={r}>{r}</option>
              ))}
            </select>
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumbs">
            <button
              className="icon-button menu-button"
              onClick={() => setMenu(!menu)}
              aria-label="Меню"
            >
              <Icon name="grid" />
            </button>
            <span>Рабочее пространство</span>
            <span className="breadcrumb-slash">/</span>
            <strong>{page}</strong>
          </div>
          <div className="top-actions">
            <label className="search">
              <Icon name="search" size={17} />
              <input
                placeholder="Поиск по системе"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value)
                  if (["Обзор бизнеса", "Аналитика"].includes(page))
                    setPage("Клиенты")
                }}
              />
              <span>⌘ K</span>
            </label>
            <button
              className="icon-button notification"
              aria-label="Уведомления"
              onClick={() => setModal("notifications")}
            >
              <Icon name="bell" />
              <i />
            </button>
            <div className="profile-divider" />
            <button className="profile" onClick={() => setModal("profile")}>
              <Avatar
                name={
                  role === "Мастер"
                    ? masters[0]
                    : role === "Клиент"
                      ? "Мария Соколова"
                      : "Алексей Морозов"
                }
              />
              <span>
                <strong>
                  {role === "Мастер"
                    ? "Анна Смирнова"
                    : role === "Клиент"
                      ? "Мария Соколова"
                      : "Алексей Морозов"}
                </strong>
                <small>{role}</small>
              </span>
              <Icon name="chevron" size={14} />
            </button>
          </div>
        </header>
        <main>
          <div className="page-heading">
            <div>
              <div className="eyebrow">
                <span className="live-dot" />
                ПОНЕДЕЛЬНИК, 18 МАЯ 2026
              </div>
              <h1>
                {page === "Обзор бизнеса"
                  ? "Ваш бизнес в хорошем ритме"
                  : page === "Главная"
                    ? "Рады видеть вас, Мария"
                    : page === "Мой день"
                      ? "Хорошего дня, Анна"
                      : page}
              </h1>
              <p>
                {page === "Обзор бизнеса"
                  ? "Всё важное о вашей Атмосфере — в одном месте."
                  : role === "Клиент"
                    ? "Ваше время. Ваша красота. Ваша Атмосфера."
                    : role === "Мастер"
                      ? "Сосредоточьтесь на главном — мы позаботимся об остальном."
                      : "Больше ясности. Меньше рутины."}
              </p>
            </div>
            {canCreate && (
              <button className="primary new-booking" onClick={openBooking}>
                <Icon name="plus" size={18} />
                {role === "Клиент" ? "Записаться" : "Новая запись"}
              </button>
            )}
          </div>
          {["Обзор бизнеса", "Аналитика", "Финансы"].includes(page) && (
            <div className="overview-filters">
              <div>
                <button
                  className="secondary date-filter"
                  onClick={() => setModal("period")}
                >
                  <Icon name="calendar" size={17} />
                  {period === "День"
                    ? "18 мая 2026"
                    : period === "Неделя"
                      ? "18 — 24 мая 2026"
                      : "1 — 31 мая 2026"}
                  <Icon name="chevron" size={14} />
                </button>
                <select
                  value={branch}
                  onChange={(e) => {
                    setBranch(e.target.value)
                    notify(
                      "Демонстрационная сводка по сети: детализация филиалов доступна в расписании",
                    )
                  }}
                >
                  <option>Все филиалы</option>
                  <option>Атмосфера · Центр</option>
                  <option>Атмосфера · Патриаршие</option>
                </select>
              </div>
              <span className="updated">
                <i />
                Данные обновлены только что
              </span>
            </div>
          )}
          <div className="page-content" key={`${role}-${page}`}>
            {renderPage()}
          </div>
          <footer>
            <span>
              atmosfera<span className="brand-period">.</span>{" "}
              <span className="footer-note">
                Создавайте красоту. Мы позаботимся о бизнесе.
              </span>
            </span>
            <span>
              <i className="live-dot" />
              Все системы работают
            </span>
          </footer>
        </main>
      </div>
      {mobileRole && (
        <nav className="bottom-nav">
          {navs[role].map((n, i) => (
            <button
              className={page === n ? "active" : ""}
              key={n}
              onClick={() => navigate(n)}
            >
              <Icon name={["grid", "calendar", "receipt", "users"][i]} />
              <span>{n}</span>
            </button>
          ))}
        </nav>
      )}
      {toast && (
        <div className="toast" role="status">
          <span>
            <Icon name="check" size={18} />
          </span>
          {toast}
          <button onClick={() => setToast("")} aria-label="Закрыть">
            <Icon name="close" size={16} />
          </button>
        </div>
      )}
      {selected && (
        <Modal title="Детали записи" close={() => setSelected(null)}>
          <div className="detail-client">
            <Avatar name={selected.client} />
            <div>
              <h2>{selected.client}</h2>
              <p>{selected.phone}</p>
            </div>
            <Status value={selected.status} />
          </div>
          <div className="detail-grid">
            <div>
              <small>УСЛУГА</small>
              <strong>{selected.service}</strong>
            </div>
            <div>
              <small>СТОИМОСТЬ</small>
              <strong>{money(selected.price)}</strong>
            </div>
            <div>
              <small>ДАТА И ВРЕМЯ</small>
              <strong>
                {new Date(selected.date).toLocaleDateString("ru-RU")} ·{" "}
                {selected.time}
              </strong>
            </div>
            <div>
              <small>МАСТЕР</small>
              <strong>{selected.master}</strong>
            </div>
          </div>
          <div className="note">
            <Icon name="receipt" size={18} />
            {selected.note || "Особых пожеланий нет"}
          </div>
          {role === "Мастер" && (
            <p>
              Ваше вознаграждение:{" "}
              <strong>{money(selected.price * 0.4)}</strong> · 40% от услуги
            </p>
          )}
          <div className="modal-actions">
            {role === "Мастер" ? (
              <button
                className="primary"
                disabled={["Выполнена", "Отменена", "Не приехал"].includes(
                  selected.status,
                )}
                onClick={() =>
                  updateStatus(
                    selected.status === "В процессе"
                      ? "Выполнена"
                      : "В процессе",
                  )
                }
              >
                {selected.status === "В процессе"
                  ? "Завершить работу"
                  : selected.status === "Выполнена"
                    ? "Работа завершена"
                    : "Начать работу"}
              </button>
            ) : role === "Клиент" ? (
              <>
                <button
                  className="secondary"
                  disabled={["Выполнена", "Отменена"].includes(selected.status)}
                  onClick={() => setModal("reschedule")}
                >
                  Перенести запись
                </button>
                <button
                  className="danger-button"
                  disabled={["Выполнена", "Отменена"].includes(selected.status)}
                  onClick={() => updateStatus("Отменена")}
                >
                  Отменить запись
                </button>
              </>
            ) : (
              <>
                <label>
                  Статус записи
                  <select
                    value={selected.status}
                    onChange={(e) => updateStatus(e.target.value)}
                  >
                    {[
                      "Новая",
                      "Подтверждена",
                      "В процессе",
                      "Выполнена",
                      "Отменена",
                      "Не приехал",
                    ].map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                </label>
                <button
                  className="secondary"
                  onClick={() => {
                    setDate(selected.date)
                    setTime(selected.time)
                    setModal("reschedule")
                  }}
                >
                  Перенести запись
                </button>
              </>
            )}
          </div>
        </Modal>
      )}
      {modal === "booking" && (
        <Modal
          title={
            step === 5
              ? "Вы записаны!"
              : role === "Клиент"
                ? "Ваше время для красоты"
                : "Новая запись"
          }
          close={() => setModal("")}
        >
          {step < 5 && (
            <>
              <div className="step-indicator">
                {["Категория", "Услуга", "Мастер", "Время", "Проверка"].map(
                  (s, i) => (
                    <span className={i <= step ? "active" : ""} key={s}>
                      <b>{i < step ? "✓" : i + 1}</b>
                      {s}
                    </span>
                  ),
                )}
              </div>
              <div className="booking-step">
                {step === 0 && (
                  <>
                    <h3>С чего начнём?</h3>
                    <p className="muted">
                      Выберите направление, а мы подберём остальное.
                    </p>
                    {["Волосы", "Ногтевой сервис", "Косметология"].map((c) => (
                      <button
                        key={c}
                        className={`choice ${category === c ? "selected" : ""}`}
                        onClick={() => {
                          setCategory(c)
                          setService(
                            services.find((s) => s.category === c)!.name,
                          )
                        }}
                      >
                        <Icon name="spark" />
                        <strong>{c}</strong>
                        <Icon name="arrow" size={17} />
                      </button>
                    ))}
                  </>
                )}
                {step === 1 && (
                  <>
                    <h3>Выберите услугу</h3>
                    {services
                      .filter((s) => s.category === category)
                      .map((s) => (
                        <button
                          key={s.name}
                          className={`choice ${
                            service === s.name ? "selected" : ""
                          }`}
                          onClick={() => setService(s.name)}
                        >
                          <div>
                            <strong>{s.name}</strong>
                            <small>{s.description}</small>
                            <small>{s.duration} мин</small>
                          </div>
                          <strong>{money(s.price)}</strong>
                        </button>
                      ))}
                  </>
                )}
                {step === 2 && (
                  <>
                    <h3>Кому доверим вашу красоту?</h3>
                    <button
                      className="choice"
                      onClick={() => {
                        setMaster(
                          masters.find(
                            (m) =>
                              !bookings.some(
                                (b) =>
                                  b.master === m &&
                                  b.date === date &&
                                  b.time === time,
                              ),
                          ) || masters[0],
                        )
                        setStep(3)
                      }}
                    >
                      <Icon name="spark" />
                      <strong>Любой свободный мастер</strong>
                      <Icon name="arrow" />
                    </button>
                    {masters.map((m) => (
                      <button
                        key={m}
                        className={`choice ${master === m ? "selected" : ""}`}
                        onClick={() => setMaster(m)}
                      >
                        <Avatar name={m} />
                        <div>
                          <strong>{m}</strong>
                          <small>Специалист Атмосферы</small>
                        </div>
                        {master === m && <Icon name="check" />}
                      </button>
                    ))}
                  </>
                )}
                {step === 3 && (
                  <>
                    <h3>Выберите удобное время</h3>
                    <label>
                      Дата визита
                      <input
                        type="date"
                        min={today}
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                      />
                    </label>
                    <p className="muted">Свободное время · {master}</p>
                    <div className="time-slots">
                      {[
                        "09:00",
                        "10:00",
                        "11:00",
                        "12:00",
                        "13:00",
                        "14:00",
                        "15:00",
                        "16:00",
                        "17:00",
                        "18:00",
                      ].map((t) => (
                        <button
                          disabled={bookings.some(
                            (b) =>
                              b.master === master &&
                              b.date === date &&
                              b.time === t &&
                              !["Отменена", "Не приехал"].includes(b.status),
                          )}
                          className={time === t ? "selected" : ""}
                          key={t}
                          onClick={() => setTime(t)}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </>
                )}
                {step === 4 && (
                  <>
                    <h3>Всё верно?</h3>
                    <div className="booking-summary">
                      <h2>{service}</h2>
                      <p>{master}</p>
                      <p>
                        {new Date(date).toLocaleDateString("ru-RU")} · {time} ·{" "}
                        {currentService.duration} мин
                      </p>
                      <strong>{money(currentService.price)}</strong>
                    </div>
                    <label>
                      Имя и фамилия
                      <input
                        required
                        value={client}
                        onChange={(e) => setClient(e.target.value)}
                      />
                    </label>
                    <label>
                      Телефон
                      <input
                        required
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                      />
                    </label>
                    <label>
                      Пожелания к визиту
                      <textarea
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder="Необязательно"
                      />
                    </label>
                  </>
                )}
              </div>
              {error && (
                <p className="form-error" role="alert">
                  {error}
                </p>
              )}
              <div className="wizard-actions">
                <button
                  className="secondary"
                  onClick={() => (step > 0 ? setStep(step - 1) : setModal(""))}
                >
                  {step > 0 ? "Назад" : "Отмена"}
                </button>
                <span>{step + 1} из 5</span>
                <button
                  className="primary"
                  onClick={() => {
                    setError("")
                    if (
                      step === 3 &&
                      (!date ||
                        bookings.some(
                          (b) =>
                            b.master === master &&
                            b.date === date &&
                            b.time === time &&
                            !["Отменена", "Не приехал"].includes(b.status),
                        ))
                    ) {
                      setError("Выберите свободное время")
                      return
                    }
                    step === 4 ? saveBooking() : setStep(step + 1)
                  }}
                >
                  {step === 4 ? "Подтвердить запись" : "Продолжить"}
                  <Icon name="arrow" size={17} />
                </button>
              </div>
            </>
          )}
          {step === 5 && (
            <div className="success-state">
              <span>
                <Icon name="check" size={34} />
              </span>
              <h2>До встречи в Атмосфере</h2>
              <p>
                {service}
                <br />
                {new Date(date).toLocaleDateString("ru-RU")} в {time}
                <br />
                Ваш мастер — {master}
              </p>
              <div className="note">
                Москва, Большая Дмитровка, 12
                <br />
                Если планы изменятся, перенесите визит в разделе записей.
              </div>
              <button
                className="primary"
                onClick={() => {
                  setModal("")
                  navigate(
                    role === "Клиент"
                      ? "Мои записи"
                      : role === "Мастер"
                        ? "Мой день"
                        : "Записи",
                  )
                }}
              >
                К моим записям <Icon name="arrow" size={17} />
              </button>
            </div>
          )}
        </Modal>
      )}
      {modal === "reschedule" && (
        <Modal title="Перенести запись" close={() => setModal("")}>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              if (!selected) return
              if (
                bookings.some(
                  (b) =>
                    b.id !== selected.id &&
                    b.master === selected.master &&
                    b.date === date &&
                    b.time === time &&
                    !["Отменена", "Не приехал"].includes(b.status),
                )
              ) {
                notify("Это время занято. Выберите другое.")
                return
              }
              const updated = { ...selected, date, time }
              setBookings(
                bookings.map((b) => (b.id === updated.id ? updated : b)),
              )
              setSelected(updated)
              setModal("")
              notify("Запись перенесена")
            }}
          >
            <label>
              Новая дата
              <input
                type="date"
                required
                min={today}
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </label>
            <label>
              Время
              <input
                type="time"
                min="09:00"
                max="20:00"
                required
                value={time}
                onChange={(e) => setTime(e.target.value)}
              />
            </label>
            <button className="primary">Сохранить новое время</button>
          </form>
        </Modal>
      )}
      {["client", "client-detail"].includes(modal) && (
        <Modal
          title={modal === "client" ? "Новый клиент" : "Карточка клиента"}
          close={() => setModal("")}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault()
              if (phone.replace(/\D/g, "").length < 10) {
                notify("Проверьте номер телефона")
                return
              }
              setExtraClients((prev) => [
                ...prev.filter((c) => c.client !== client),
                { client, phone },
              ])
              setBookings((prev) =>
                prev.map((b) => (b.client === client ? { ...b, phone } : b)),
              )
              setModal("")
              notify("Данные клиента сохранены")
            }}
          >
            <label>
              Имя и фамилия
              <input
                required
                value={client}
                onChange={(e) => setClient(e.target.value)}
              />
            </label>
            <label>
              Телефон
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </label>
            {modal === "client-detail" && (
              <>
                <h3>История посещений</h3>
                {bookings
                  .filter((b) => b.client === client)
                  .map((b) => (
                    <div className="history-item" key={b.id}>
                      <strong>{b.service}</strong>
                      <span>
                        {b.date} · {b.time}
                      </span>
                      <Status value={b.status} />
                    </div>
                  ))}
              </>
            )}
            <button className="primary">Сохранить клиента</button>
          </form>
          {modal === "client-detail" && role === "Владелец" && (
            <div className="client-delete">
              {confirmDeleteClient ? (
                <>
                  <p>
                    Удалить карточку клиента «{client}»?{" "}
                    {clientVisitCount > 0
                      ? `Все записи клиента (${clientVisitCount}) тоже будут удалены.`
                      : "Карточка будет удалена."}{" "}
                    Действие необратимо.
                  </p>
                  <div className="modal-actions">
                    <button
                      type="button"
                      className="danger-button"
                      onClick={deleteClientCard}
                    >
                      Удалить навсегда
                    </button>
                    <button
                      type="button"
                      className="secondary"
                      onClick={() => setConfirmDeleteClient(false)}
                    >
                      Отмена
                    </button>
                  </div>
                </>
              ) : (
                <button
                  type="button"
                  className="danger-button"
                  onClick={() => setConfirmDeleteClient(true)}
                >
                  Удалить клиента
                </button>
              )}
            </div>
          )}
        </Modal>
      )}
      {modal === "schedule" && (
        <Modal title={master} close={() => setModal("")}>
          <p className="muted">Расписание · 18 мая</p>
          {bookings
            .filter((b) => b.master === master)
            .map((b) => (
              <button
                className="choice"
                key={b.id}
                onClick={() => {
                  setModal("")
                  setSelected(b)
                }}
              >
                <strong>{b.time}</strong>
                <div>
                  <strong>{b.client}</strong>
                  <small>{b.service}</small>
                </div>
                <Status value={b.status} />
              </button>
            ))}
          <form
            onSubmit={(e) => {
              e.preventDefault()
              notify("Рабочее время сохранено")
              setModal("")
            }}
          >
            <label>
              Начало смены
              <input type="time" defaultValue="09:00" required />
            </label>
            <label>
              Конец смены
              <input type="time" defaultValue="21:00" required />
            </label>
            <button className="primary">Сохранить расписание</button>
          </form>
        </Modal>
      )}
      {modal === "period" && (
        <Modal title="Отчётный период" close={() => setModal("")}>
          {["День", "Неделя", "Месяц"].map((p) => (
            <button
              className={`choice ${period === p ? "selected" : ""}`}
              key={p}
              onClick={() => {
                setPeriod(p)
                setModal("")
              }}
            >
              <Icon name="calendar" />
              <strong>
                {p === "День"
                  ? "Сегодня · 18 мая"
                  : p === "Неделя"
                    ? "Эта неделя · 18–24 мая"
                    : "Этот месяц · Май 2026"}
              </strong>
              {period === p && <Icon name="check" />}
            </button>
          ))}
        </Modal>
      )}
      {modal === "notifications" && (
        <Modal title="Центр уведомлений" close={() => setModal("")}>
          <div className="notification-item">
            <span className="live-dot" />
            <div>
              <h3>День начинается с хороших новостей</h3>
              <p>На сегодня запланировано {mine.length} записей.</p>
              <small>Сегодня, 09:00</small>
            </div>
          </div>
          {mine
            .filter((b) => b.status === "Новая")
            .map((b) => (
              <button
                className="choice"
                key={b.id}
                onClick={() => {
                  setModal("")
                  setSelected(b)
                }}
              >
                <Icon name="calendar" />
                <div>
                  <strong>Новая запись · {b.time}</strong>
                  <small>
                    {b.client} · {b.service}
                  </small>
                </div>
                <Icon name="arrow" />
              </button>
            ))}
        </Modal>
      )}
      {modal === "profile" && (
        <Modal title="Ваш профиль" close={() => setModal("")}>
          <div className="detail-client">
            <Avatar name="Алексей Морозов" />
            <div>
              <h2>{role}</h2>
              <p>Демонстрационный доступ</p>
            </div>
          </div>
          <label>
            Посмотреть интерфейс другой роли
            <select
              value={role}
              onChange={(e) => {
                const r = e.target.value as Role
                setRole(r)
                navigate(navs[r][0])
                setModal("")
              }}
            >
              {Object.keys(navs).map((r) => (
                <option key={r}>{r}</option>
              ))}
            </select>
          </label>
          <p className="muted">
            При переключении роли записи сохраняются, а права и навигация
            изменяются.
          </p>
        </Modal>
      )}
      {modal === "workspace" && (
        <Modal title="Ваше пространство" close={() => setModal("")}>
          <div className="personal-banner">
            <h2>Атмосфера</h2>
            <Icon name="spark" size={30} />
          </div>
          <p>Сеть салонов красоты · Москва</p>
          <p className="muted">
            2 филиала · 4 специалиста · единая клиентская база
          </p>
          <button
            className="primary"
            onClick={() => {
              setModal("")
              if (role === "Владелец") navigate("Филиалы")
              else notify("Вы работаете в пространстве «Атмосфера»")
            }}
          >
            Продолжить работу <Icon name="arrow" size={16} />
          </button>
        </Modal>
      )}
      {modal === "help" && (
        <Modal title="На связи с вашей Атмосферой" close={() => setModal("")}>
          <div className="help-illustration">
            <Icon name="spark" size={50} />
          </div>
          <h2>Меньше рутины. Больше любимого дела.</h2>
          <p className="muted">
            Это интерактивный прототип CRM. Переключайте роли внизу бокового
            меню, создавайте записи и следите за изменениями в общей базе.
          </p>
          <div className="note">
            Данные записей хранятся локально в вашем браузере. Серверная
            авторизация и отправка уведомлений не подключены.
          </div>
          <button className="primary" onClick={() => setModal("")}>
            Всё понятно <Icon name="check" size={18} />
          </button>
        </Modal>
      )}
    </div>
  )
}
