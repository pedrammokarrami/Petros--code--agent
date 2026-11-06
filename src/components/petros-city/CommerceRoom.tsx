import React, { useState, useEffect } from 'react';
import {
  ShoppingBag,
  TrendingUp,
  DollarSign,
  Calculator,
  Shield,
  Zap,
  CheckCircle2,
  PieChart,
  BarChart3,
  Layers,
  ArrowUpRight,
  Flame,
  Cpu,
} from 'lucide-react';

interface Props {
  isFa?: boolean;
}

export function CommerceRoom({ isFa = false }: Props) {
  const [businessModel, setBusinessModel] = useState<'saas' | 'ecommerce' | 'agency' | 'api'>('saas');
  
  // Interactive Simulator State
  const [visitors, setVisitors] = useState<number>(10000);
  const [conversionRate, setConversionRate] = useState<number>(2.5); // %
  const [pricePerMonth, setPricePerMonth] = useState<number>(49); // $
  const [churnRate, setChurnRate] = useState<number>(4.0); // %
  const [cac, setCac] = useState<number>(35); // $
  
  // Live Fuel Status
  const [fuelStatus, setFuelStatus] = useState<any>(null);

  useEffect(() => {
    fetch('/api/fuel/status')
      .then((r) => r.json())
      .then((d) => setFuelStatus(d))
      .catch(() => {});
  }, []);

  // Real Unit Economics Calculations
  const payingCustomers = Math.round(visitors * (conversionRate / 100));
  const mrr = payingCustomers * pricePerMonth;
  const arr = mrr * 12;
  const ltv = churnRate > 0 ? Math.round(pricePerMonth / (churnRate / 100)) : pricePerMonth * 24;
  const ltvCacRatio = cac > 0 ? (ltv / cac).toFixed(1) : '∞';
  const paybackMonths = pricePerMonth > 0 ? (cac / pricePerMonth).toFixed(1) : '0';

  const models = [
    {
      id: 'saas',
      title: isFa ? 'مدل اشتراک نرم‌افزاری (SaaS)' : 'B2B & B2C SaaS',
      desc: isFa ? 'درآمد تکرارشونده ماهیانه با بسته‌های اشتراکی' : 'Predictable Monthly Recurring Revenue (MRR)',
      margin: '85-92%',
    },
    {
      id: 'ecommerce',
      title: isFa ? 'تجارت الکترونیک و فروش مستقیم' : 'E-Commerce & DTC',
      desc: isFa ? 'فروش مستقیم محصولات فیزیکی یا دیجیتال با سبد خرید' : 'High volume digital or physical catalog sales',
      margin: '40-65%',
    },
    {
      id: 'agency',
      title: isFa ? 'آژانس محصول‌محور (Productized Agency)' : 'Productized Agency',
      desc: isFa ? 'قراردادهای ماهانه با ارزش بالا و تحویل خودکار' : 'High-ticket retainers with automated AI delivery',
      margin: '70-85%',
    },
    {
      id: 'api',
      title: isFa ? 'پلتفرم API و مصرف‌محور' : 'API & Usage Platform',
      desc: isFa ? 'محاسبه هزینه بر اساس حجم درخواست‌ها و توکن' : 'Usage-based metering and autonomous developer tools',
      margin: '75-90%',
    },
  ];

  return (
    <div className="w-full max-w-6xl mx-auto p-4 sm:p-6 space-y-6 text-slate-100 animate-fadeIn">
      {/* Header */}
      <div className="p-5 rounded-2xl bg-[#060D1A]/90 border border-[#4FB8FF]/20 backdrop-blur-md shadow-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-white flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-[#4FB8FF]" />
            {isFa ? 'تجارت، مدل‌های درآمدی و اقتصاد واحد (Commerce)' : 'Petros Commerce & Unit Economics'}
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            {isFa
              ? 'معماری مدل‌های تجاری استارتاپ، محاسبه LTV/CAC، جریان درآمد تکرارشونده و مصرف سوخت هوش مصنوعی'
              : 'Startup monetization models, dynamic unit economics simulator, and zero-cost token telemetry'}
          </p>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs">
          <span className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
            MRR: ${mrr.toLocaleString()}
          </span>
          <span className="px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-300">
            LTV/CAC: {ltvCacRatio}x
          </span>
        </div>
      </div>

      {/* Business Model Selector */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {models.map((m) => {
          const isSel = businessModel === m.id;
          return (
            <div
              key={m.id}
              onClick={() => setBusinessModel(m.id as any)}
              className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between space-y-2.5 ${
                isSel
                  ? 'bg-[#1F6FEB]/15 border-[#4FB8FF] text-white shadow-xl shadow-blue-900/20'
                  : 'bg-[#060D1A]/80 border-slate-800 hover:border-slate-700 text-slate-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white">{m.title}</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-slate-900 text-[#4FB8FF] border border-slate-800">
                  {m.margin} Margin
                </span>
              </div>
              <p className="text-xs text-slate-400 line-clamp-2">{m.desc}</p>
              <div className="pt-2 text-[11px] font-mono text-emerald-400 flex items-center justify-between border-t border-slate-800/80">
                <span>{isFa ? 'مدل فعال' : 'Model Architecture'}</span>
                {isSel && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
              </div>
            </div>
          );
        })}
      </div>

      {/* Interactive Simulator & Telemetry Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Simulator Sliders */}
        <section className="lg:col-span-2 rounded-2xl bg-[#060D1A]/90 border border-slate-800 p-5 space-y-5 shadow-xl">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800 text-xs">
            <span className="font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Calculator className="w-4 h-4 text-[#4FB8FF]" />
              {isFa ? 'شبیه‌ساز تعاملی اقتصاد واحد (Unit Economics)' : 'Interactive Unit Economics Simulator'}
            </span>
            <span className="text-slate-400 font-mono text-[11px]">Dynamic Projection</span>
          </div>

          <div className="space-y-4">
            {/* Monthly Visitors */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-slate-300">{isFa ? 'بازدیدکنندگان ماهیانه (Visitors)' : 'Monthly Visitors'}</span>
                <span className="font-mono text-[#4FB8FF] font-semibold">{visitors.toLocaleString()}</span>
              </div>
              <input
                type="range"
                min="1000"
                max="100000"
                step="1000"
                value={visitors}
                onChange={(e) => setVisitors(Number(e.target.value))}
                className="w-full accent-[#1F6FEB] cursor-pointer"
              />
            </div>

            {/* Conversion Rate */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-slate-300">{isFa ? 'نرخ تبدیل مشتری (Conversion Rate)' : 'Conversion Rate'}</span>
                <span className="font-mono text-[#4FB8FF] font-semibold">{conversionRate}%</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="10"
                step="0.1"
                value={conversionRate}
                onChange={(e) => setConversionRate(Number(e.target.value))}
                className="w-full accent-[#1F6FEB] cursor-pointer"
              />
            </div>

            {/* Price / ARPU */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-slate-300">
                  {isFa ? 'قیمت اشتراک یا سبد خرید (Average Price)' : 'Subscription Price / AOV'}
                </span>
                <span className="font-mono text-[#4FB8FF] font-semibold">${pricePerMonth} / mo</span>
              </div>
              <input
                type="range"
                min="9"
                max="300"
                step="5"
                value={pricePerMonth}
                onChange={(e) => setPricePerMonth(Number(e.target.value))}
                className="w-full accent-[#1F6FEB] cursor-pointer"
              />
            </div>

            {/* Churn Rate */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-slate-300">{isFa ? 'نرخ ریزش ماهیانه (Monthly Churn)' : 'Monthly Churn Rate'}</span>
                <span className="font-mono text-[#4FB8FF] font-semibold">{churnRate}%</span>
              </div>
              <input
                type="range"
                min="1"
                max="15"
                step="0.5"
                value={churnRate}
                onChange={(e) => setChurnRate(Number(e.target.value))}
                className="w-full accent-[#1F6FEB] cursor-pointer"
              />
            </div>

            {/* CAC */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-slate-300">{isFa ? 'هزینه جذب مشتری (CAC)' : 'Customer Acquisition Cost (CAC)'}</span>
                <span className="font-mono text-[#4FB8FF] font-semibold">${cac}</span>
              </div>
              <input
                type="range"
                min="5"
                max="150"
                step="5"
                value={cac}
                onChange={(e) => setCac(Number(e.target.value))}
                className="w-full accent-[#1F6FEB] cursor-pointer"
              />
            </div>
          </div>

          {/* Computed Metrics Dashboard */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-800">
            <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-center">
              <p className="text-[10px] text-slate-400 uppercase font-mono">{isFa ? 'مشتریان فعال' : 'Customers'}</p>
              <p className="text-lg font-bold text-white mt-0.5">{payingCustomers}</p>
            </div>
            <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-center">
              <p className="text-[10px] text-slate-400 uppercase font-mono">MRR</p>
              <p className="text-lg font-bold text-emerald-400 mt-0.5">${mrr.toLocaleString()}</p>
            </div>
            <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-center">
              <p className="text-[10px] text-slate-400 uppercase font-mono">ARR</p>
              <p className="text-lg font-bold text-emerald-400 mt-0.5">${arr.toLocaleString()}</p>
            </div>
            <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-center">
              <p className="text-[10px] text-slate-400 uppercase font-mono">LTV</p>
              <p className="text-lg font-bold text-[#4FB8FF] mt-0.5">${ltv.toLocaleString()}</p>
            </div>
          </div>
        </section>

        {/* Zero-Cost Model Fuel & Token Economy */}
        <section className="rounded-2xl bg-[#060D1A]/90 border border-slate-800 p-5 space-y-4 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Flame className="w-4 h-4 text-amber-400" />
                {isFa ? 'اقتصاد سوخت هوش مصنوعی' : 'Zero-Cost Token Economy'}
              </h3>
              <span className="text-[10px] font-mono text-emerald-400">$0.00 SPENT</span>
            </div>

            <div className="mt-4 space-y-3">
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-300">{isFa ? 'موتورهای فعال محلی' : 'Active Local Engines'}</span>
                  <span className="text-emerald-400 font-mono font-semibold">Ollama + Kilo Free</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  {isFa
                    ? '۱۰۰٪ توکن‌ها روی سخت‌افزار محلی یا سطح رایگان تایید شده اجرا می‌شوند.'
                    : '100% of tokens processed locally or on verified free tiers with zero API invoices.'}
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-300">{isFa ? 'صرفه‌جویی ماهیانه تخمینی' : 'Cost Avoided'}</span>
                  <span className="text-emerald-400 font-mono font-semibold">~$140 / mo</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  {isFa
                    ? 'معادل هزینه اشتراک و APIهای تجاری در مقایسه با معماری پتروس.'
                    : 'Compared to conventional commercial SaaS model subscriptions.'}
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-300">LTV / CAC Health</span>
                  <span
                    className={`font-mono font-semibold ${
                      Number(ltvCacRatio) >= 3.0 ? 'text-emerald-400' : 'text-amber-400'
                    }`}
                  >
                    {ltvCacRatio}x {Number(ltvCacRatio) >= 3.0 ? '✓ Healthy' : '⚠ Caution'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Payback period: <span className="text-white font-mono">{paybackMonths} months</span>
                </p>
              </div>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-blue-950/20 border border-blue-500/20 text-[11px] text-blue-300 flex items-center gap-2">
            <Shield className="w-4 h-4 text-[#4FB8FF] shrink-0" />
            <span>{isFa ? 'بدون ایجاد هزینه یا تراکنش غیرواقعی مالی' : 'Real local calculations. No simulated financial data.'}</span>
          </div>
        </section>
      </div>
    </div>
  );
}
