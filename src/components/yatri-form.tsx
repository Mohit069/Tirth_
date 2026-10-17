"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition, type ComponentType, type FormEvent } from "react";
import { createEntry } from "@/app/actions/entry";
import { addDays, formatDayMonth, formatDmy } from "@/lib/dates";
import {
  ID_TYPES,
  MAX_COUNT,
  MAX_NIGHTS,
  VEHICLE_TYPES,
  allowedDateWindow,
  idLast4FromInput,
  newEntryId,
  normalizeMobile,
  validateEntry,
  type EntryPayload,
  type FieldErrors,
  type FieldName,
  type IdType,
  type VehicleType,
} from "@/lib/entry-rules";
import { dict, otherLang, type Lang } from "@/lib/i18n";
import { shrinkPhoto } from "@/lib/id-photo";
import { DateCalendar } from "./date-calendar";
import { ChoiceGroup, Counter, FieldError, FieldLabel, Section, inputBorder, inputClass, type Choice } from "./form-parts";
import {
  AlertIcon,
  ArrowLeftIcon,
  BedIcon,
  CalendarIcon,
  CameraIcon,
  CheckIcon,
  CupIcon,
  IdCardIcon,
  MoonIcon,
  MealIcon,
  UsersIcon,
} from "./icons";

type Seva = "nashta" | "bhojan" | "stay";

const FIELD_ORDER: FieldName[] = [
  "seva",
  "name",
  "mobile",
  "city",
  "men",
  "women",
  "children",
  "people",
  "mealDate",
  "mealPeople",
  "checkInDate",
  "nights",
  "idType",
  "idNumber",
  "idPhoto",
  "vehicleNumber",
];

export function YatriForm({ lang, today, isStaff }: { lang: Lang; today: string; isStaff: boolean }) {
  const t = dict[lang];
  const altLang = otherLang(lang);
  const alt = dict[altLang];
  const router = useRouter();

  // One id per form: if the same form is sent twice (double tap, weak network),
  // the server returns the same token instead of making a second one.
  const [entryId] = useState(newEntryId);

  const [sevas, setSevas] = useState<Record<Seva, boolean>>({ nashta: false, bhojan: false, stay: false });
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [city, setCity] = useState("");
  const [men, setMen] = useState(0);
  const [women, setWomen] = useState(0);
  const [children, setChildren] = useState(0);
  const [mealDate, setMealDate] = useState(today);
  const [mealPeople, setMealPeople] = useState<number | null>(null); // null = same as total
  const [checkIn, setCheckIn] = useState(today);
  const [nights, setNights] = useState(1);
  const [idType, setIdType] = useState<IdType>("AADHAAR");
  const [idNumber, setIdNumber] = useState("");
  const [idPhoto, setIdPhoto] = useState<string | null>(null); // shrunk JPEG, as a data URL
  const [photoBusy, setPhotoBusy] = useState(false);
  const [vehicleType, setVehicleType] = useState<VehicleType | "NONE">("NONE");
  const [vehicleNumber, setVehicleNumber] = useState("");

  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<"fix" | "network" | null>(null);
  const [pending, startTransition] = useTransition();

  const total = men + women + children;
  const mealPeopleValue = mealPeople ?? Math.max(total, 1);
  const wantsMeal = sevas.nashta || sevas.bhojan;
  const mealWindow = allowedDateWindow(today, isStaff, "meal");
  const checkInWindow = allowedDateWindow(today, isStaff, "checkIn");
  const checkOut = addDays(checkIn, nights);

  let step = 1;
  const nextStep = () => ++step;

  function clearError(...fields: FieldName[]) {
    if (fields.some((f) => errors[f])) {
      setErrors((prev) => {
        const next = { ...prev };
        for (const f of fields) delete next[f];
        return next;
      });
    }
  }

  function focusFirstError(errs: FieldErrors) {
    const first = FIELD_ORDER.find((f) => errs[f]);
    if (!first) return;
    const el = document.getElementById(`f-${first}`);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    if (el instanceof HTMLInputElement) el.focus({ preventScroll: true });
  }

  async function onPhoto(file: File | undefined) {
    if (!file) return;
    setPhotoBusy(true);
    clearError("idPhoto");
    try {
      setIdPhoto(await shrinkPhoto(file));
    } catch {
      setErrors((prev) => ({ ...prev, idPhoto: "errIdPhoto" }));
    } finally {
      setPhotoBusy(false);
    }
  }

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pending || photoBusy) return;

    const clientErrors: FieldErrors = {};
    let idLast4: string | null = null;
    if (sevas.stay) {
      const r = idLast4FromInput(idType, idNumber);
      if ("error" in r) clientErrors.idNumber = r.error;
      else idLast4 = r.last4;
    }

    const payload: EntryPayload = {
      id: entryId,
      nashta: sevas.nashta,
      bhojan: sevas.bhojan,
      stay: sevas.stay,
      name,
      mobile: normalizeMobile(mobile),
      city,
      men,
      women,
      children,
      mealDate: wantsMeal ? mealDate : null,
      mealPeople: wantsMeal ? mealPeopleValue : null,
      checkInDate: sevas.stay ? checkIn : null,
      nights: sevas.stay ? nights : null,
      idType: sevas.stay ? idType : null,
      idLast4,
      vehicleType: sevas.stay && vehicleType !== "NONE" ? vehicleType : null,
      vehicleNumber: sevas.stay && vehicleType !== "NONE" ? vehicleNumber : null,
    };

    const checked = validateEntry(payload, { today, isStaff });
    const allErrors: FieldErrors = { ...(checked.ok ? {} : checked.errors), ...clientErrors };
    if (Object.keys(allErrors).length > 0) {
      setErrors(allErrors);
      setFormError("fix");
      focusFirstError(allErrors);
      return;
    }

    setErrors({});
    setFormError(null);
    startTransition(async () => {
      try {
        const res = await createEntry(payload, sevas.stay ? idPhoto : null);
        if (res.ok) {
          router.push(`/token/${res.id}`);
        } else if ("errors" in res) {
          setErrors(res.errors);
          setFormError("fix");
          focusFirstError(res.errors);
        } else {
          setFormError("network");
        }
      } catch {
        setFormError("network");
      }
    });
  }

  const err = (f: FieldName) => (errors[f] ? t[errors[f]] : undefined);

  const sevaCards: { key: Seva; label: string; altLabel: string; Icon: ComponentType<{ size?: number }>; tone: string }[] = [
    { key: "nashta", label: t.cardNashta, altLabel: alt.cardNashta, Icon: CupIcon, tone: "bg-nashta-soft text-nashta" },
    { key: "bhojan", label: t.cardBhojan, altLabel: alt.cardBhojan, Icon: MealIcon, tone: "bg-bhojan-soft text-bhojan" },
    { key: "stay", label: t.cardStay, altLabel: alt.cardStay, Icon: BedIcon, tone: "bg-stay-soft text-stay" },
  ];

  const dayChoices: Choice<string>[] = [
    { value: today, label: t.today, sub: formatDayMonth(today, lang) },
    { value: addDays(today, 1), label: t.tomorrow, sub: formatDayMonth(addDays(today, 1), lang) },
  ];

  const idChoices: Choice<IdType>[] = ID_TYPES.map((v) => ({ value: v, label: t[`id${v}`] }));
  const vehicleChoices: Choice<VehicleType | "NONE">[] = [
    { value: "NONE", label: t.vehNONE },
    ...VEHICLE_TYPES.map((v) => ({ value: v, label: t[`veh${v}`] })),
  ];

  const dateInput = (id: string, value: string, onChange: (v: string) => void, invalid: boolean) => (
    <input
      id={id}
      type="date"
      value={value}
      min={mealWindow.min}
      max={mealWindow.max}
      onChange={(e) => e.currentTarget.value && onChange(e.currentTarget.value)}
      className={`${inputClass} ${inputBorder(invalid)}`}
    />
  );

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      {isStaff ? (
        <div className="flex items-center gap-3 rounded-2xl border border-stay/25 bg-stay-soft px-4 py-3 text-[15px] text-stay">
          <span className="flex-1 font-semibold">{t.staffEntryBanner}</span>
          <Link href="/staff" className="inline-flex shrink-0 items-center gap-1 rounded-full bg-card px-3 py-1.5 text-sm font-semibold shadow-sm">
            <ArrowLeftIcon size={16} />
            {t.staffCounter}
          </Link>
        </div>
      ) : null}

      <div className="px-1 pb-1">
        <h1 className="text-[26px] font-bold leading-tight text-brand-strong">{t.formTitle}</h1>
        <p className="text-[13px] text-muted" lang={altLang}>
          {alt.formTitle}
        </p>
        <p className="mt-2 text-[16px] leading-relaxed text-ink/85">{t.formIntro}</p>
      </div>

      {/* 1. Seva */}
      <Section step={step} title={t.stepSeva} altTitle={alt.stepSeva} altLang={altLang} id="f-seva">
        <fieldset>
          <legend className="sr-only">{t.stepSeva}</legend>
          <p className="-mt-2 mb-3 text-[14px] text-muted">{t.stepSevaHint}</p>
          <div className="grid grid-cols-3 gap-2.5">
            {sevaCards.map(({ key, label, altLabel, Icon, tone }) => {
              const checked = sevas[key];
              return (
                <label
                  key={key}
                  className={`relative flex cursor-pointer select-none flex-col items-center gap-1.5 rounded-2xl border-2 px-1 pb-3 pt-4 text-center transition has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-brand-tint active:scale-[0.97] ${
                    checked ? "border-brand bg-brand-soft shadow-sm" : errors.seva ? "border-danger/60 bg-card" : "border-line-strong bg-card"
                  }`}
                >
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={checked}
                    onChange={(e) => {
                      const on = e.currentTarget.checked;
                      setSevas((s) => ({ ...s, [key]: on }));
                      clearError("seva");
                    }}
                  />
                  <span
                    className={`absolute right-1.5 top-1.5 grid size-6 place-items-center rounded-full transition ${
                      checked ? "bg-brand text-white" : "border-2 border-line-strong bg-card text-transparent"
                    }`}
                  >
                    <CheckIcon size={15} strokeWidth={3} />
                  </span>
                  <span className={`grid size-14 place-items-center rounded-full ${tone}`}>
                    <Icon size={30} />
                  </span>
                  <span className="text-[16px] font-bold leading-tight">{label}</span>
                  <span className="text-[12px] leading-tight text-muted" lang={altLang}>
                    {altLabel}
                  </span>
                </label>
              );
            })}
          </div>
          <FieldError id="seva-error" message={err("seva")} />
        </fieldset>
      </Section>

      {/* 2. Details */}
      <Section step={nextStep()} title={t.stepDetails} altTitle={alt.stepDetails} altLang={altLang}>
        <div>
          <FieldLabel htmlFor="f-name" label={t.name} altLabel={alt.name} altLang={altLang} />
          <input
            id="f-name"
            className={`${inputClass} ${inputBorder(!!errors.name)} mt-2`}
            value={name}
            onChange={(e) => {
              setName(e.currentTarget.value);
              clearError("name");
            }}
            placeholder={t.namePlaceholder}
            autoComplete="name"
            enterKeyHint="next"
            maxLength={60}
            aria-invalid={!!errors.name || undefined}
            aria-describedby={errors.name ? "name-error" : undefined}
          />
          <FieldError id="name-error" message={err("name")} />
        </div>

        <div>
          <FieldLabel htmlFor="f-mobile" label={t.mobile} altLabel={alt.mobile} altLang={altLang} />
          <div className={`mt-2 flex items-center rounded-xl border-2 bg-card transition focus-within:border-brand ${inputBorder(!!errors.mobile)}`}>
            <span className="select-none pl-4 pr-2 text-[18px] font-medium text-muted">+91</span>
            <input
              id="f-mobile"
              type="tel"
              inputMode="numeric"
              className="h-[48px] w-full min-w-0 rounded-xl bg-transparent pr-4 text-[18px] tracking-wide outline-none"
              value={mobile}
              onChange={(e) => {
                setMobile(e.currentTarget.value.replace(/[^\d+\s-]/g, "").slice(0, 16));
                clearError("mobile");
              }}
              onBlur={() => {
                const n = normalizeMobile(mobile);
                if (n.length === 10) setMobile(n);
              }}
              placeholder="98765 43210"
              autoComplete="tel-national"
              enterKeyHint="next"
              aria-invalid={!!errors.mobile || undefined}
              aria-describedby={errors.mobile ? "mobile-error" : undefined}
            />
          </div>
          <FieldError id="mobile-error" message={err("mobile")} />
        </div>

        <div>
          <FieldLabel htmlFor="f-city" label={t.city} altLabel={alt.city} altLang={altLang} />
          <input
            id="f-city"
            className={`${inputClass} ${inputBorder(!!errors.city)} mt-2`}
            value={city}
            onChange={(e) => {
              setCity(e.currentTarget.value);
              clearError("city");
            }}
            placeholder={t.cityPlaceholder}
            autoComplete="address-level2"
            enterKeyHint="next"
            maxLength={60}
            aria-invalid={!!errors.city || undefined}
            aria-describedby={errors.city ? "city-error" : undefined}
          />
          <FieldError id="city-error" message={err("city")} />
        </div>
      </Section>

      {/* 3. People */}
      <Section
        step={nextStep()}
        title={t.stepPeople}
        altTitle={alt.stepPeople}
        altLang={altLang}
        icon={<UsersIcon size={24} />}
        id="f-people"
      >
        <div className="-my-1 divide-y divide-line">
          {(
            [
              ["men", t.men, alt.men, men, setMen],
              ["women", t.women, alt.women, women, setWomen],
              ["children", t.children, alt.children, children, setChildren],
            ] as const
          ).map(([key, label, altLabel, value, set]) => (
            <div key={key} className="flex items-center justify-between gap-3 py-3">
              <FieldLabel htmlFor={`f-${key}`} label={label} altLabel={altLabel} altLang={altLang} />
              <Counter
                id={`f-${key}`}
                value={value}
                max={MAX_COUNT}
                label={label}
                decreaseLabel={t.decrease}
                increaseLabel={t.increase}
                invalid={!!errors[key] || !!errors.people}
                onChange={(v) => {
                  set(v);
                  clearError(key, "people");
                }}
              />
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between rounded-2xl bg-brand-soft px-4 py-3">
          <span>
            <span className="block text-[17px] font-bold text-brand-strong">{t.total}</span>
            <span className="block text-[12px] text-muted" lang={altLang}>
              {alt.total}
            </span>
          </span>
          <output htmlFor="f-men f-women f-children" className="tabular text-[30px] font-bold leading-none text-brand-strong">
            {total}
          </output>
        </div>
        <FieldError id="people-error" message={err("people")} />
      </Section>

      {/* 4. Nashta / Bhojan */}
      {wantsMeal ? (
        <Section step={nextStep()} title={t.mealSection} altTitle={alt.mealSection} altLang={altLang} icon={<MealIcon size={24} />}>
          <div id="f-mealDate">
            <FieldLabel htmlFor={isStaff ? "f-mealDate-input" : undefined} label={t.mealDate} altLabel={alt.mealDate} altLang={altLang} />
            <div className="mt-2">
              {isStaff ? (
                dateInput("f-mealDate-input", mealDate, (v) => {
                  setMealDate(v);
                  clearError("mealDate");
                }, !!errors.mealDate)
              ) : (
                <ChoiceGroup
                  name="mealDate"
                  options={dayChoices}
                  value={mealDate}
                  columns={2}
                  invalid={!!errors.mealDate}
                  onChange={(v) => {
                    setMealDate(v);
                    clearError("mealDate");
                  }}
                />
              )}
            </div>
            <FieldError id="mealDate-error" message={err("mealDate")} />
          </div>
          <div className="flex items-center justify-between gap-3">
            <FieldLabel htmlFor="f-mealPeople" label={t.mealPeople} altLabel={alt.mealPeople} altLang={altLang} />
            <Counter
              id="f-mealPeople"
              value={mealPeopleValue}
              min={1}
              max={MAX_COUNT * 3}
              label={t.mealPeople}
              decreaseLabel={t.decrease}
              increaseLabel={t.increase}
              invalid={!!errors.mealPeople}
              onChange={(v) => {
                setMealPeople(v);
                clearError("mealPeople");
              }}
            />
          </div>
          <FieldError id="mealPeople-error" message={err("mealPeople")} />
        </Section>
      ) : null}

      {/* 5. Stay */}
      {sevas.stay ? (
        <Section step={nextStep()} title={t.staySection} altTitle={alt.staySection} altLang={altLang} icon={<BedIcon size={24} />}>
          <div id="f-checkInDate">
            <FieldLabel label={t.checkIn} altLabel={alt.checkIn} altLang={altLang} />
            <div className="mt-2">
              <DateCalendar
                value={checkIn}
                today={today}
                min={checkInWindow.min}
                max={checkInWindow.max}
                rangeEnd={checkOut}
                invalid={!!errors.checkInDate}
                lang={lang}
                t={t}
                onChange={(v) => {
                  setCheckIn(v);
                  clearError("checkInDate");
                }}
              />
            </div>
            <FieldError id="checkIn-error" message={err("checkInDate")} />
          </div>

          <div>
            <div className="flex items-center justify-between gap-3">
              <FieldLabel htmlFor="f-nights" label={t.nights} altLabel={alt.nights} altLang={altLang} />
              <Counter
                id="f-nights"
                value={nights}
                max={MAX_NIGHTS}
                label={t.nights}
                decreaseLabel={t.decrease}
                increaseLabel={t.increase}
                invalid={!!errors.nights}
                onChange={(v) => {
                  setNights(v);
                  clearError("nights");
                }}
              />
            </div>
            <div className="mt-3 flex items-center gap-3 rounded-2xl bg-stay-soft px-4 py-3 text-stay">
              <CalendarIcon size={22} className="shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="text-[13px] font-medium opacity-80">
                  {t.checkOut} <span lang={altLang}>· {alt.checkOut}</span>
                </div>
                <div className="text-[18px] font-bold leading-snug">
                  {formatDmy(checkOut)}
                  <span className="ml-2 inline-flex items-center gap-1 text-[14px] font-semibold">
                    <MoonIcon size={15} />
                    {t.nightsCount(nights)}
                  </span>
                </div>
              </div>
            </div>
            <FieldError id="nights-error" message={err("nights")} />
          </div>

          <div id="f-idType">
            <div className="flex items-start justify-between gap-3">
              <FieldLabel label={t.idType} altLabel={alt.idType} altLang={altLang} />
              <IdCardIcon size={22} className="mt-0.5 shrink-0 text-muted" />
            </div>
            <div className="mt-2">
              <ChoiceGroup
                name="idType"
                options={idChoices}
                value={idType}
                columns={2}
                invalid={!!errors.idType}
                onChange={(v) => {
                  setIdType(v);
                  setIdNumber("");
                  clearError("idType", "idNumber");
                }}
              />
            </div>
            <FieldError id="idType-error" message={err("idType")} />
          </div>

          <div>
            <FieldLabel htmlFor="f-idNumber" label={`${t.idNumber} (${t[`id${idType}`]})`} altLabel={alt.idNumber} altLang={altLang} />
            <input
              id="f-idNumber"
              className={`${inputClass} ${inputBorder(!!errors.idNumber)} mt-2 tracking-wider`}
              value={idNumber}
              inputMode={idType === "AADHAAR" ? "numeric" : "text"}
              autoCapitalize="characters"
              autoComplete="off"
              spellCheck={false}
              placeholder={idType === "AADHAAR" ? "1234 5678 9012" : ""}
              maxLength={idType === "AADHAAR" ? 14 : 20}
              onChange={(e) => {
                const raw = e.currentTarget.value;
                if (idType === "AADHAAR") {
                  const digits = raw.replace(/\D/g, "").slice(0, 12);
                  setIdNumber(digits.replace(/(\d{4})(?=\d)/g, "$1 "));
                } else {
                  setIdNumber(raw.toUpperCase().slice(0, 20));
                }
                clearError("idNumber");
              }}
              aria-invalid={!!errors.idNumber || undefined}
              aria-describedby="idNumber-hint"
            />
            <p id="idNumber-hint" className="mt-2 text-[13px] leading-snug text-muted">
              🔒 {t.idNumberHint}
            </p>
            <FieldError id="idNumber-error" message={err("idNumber")} />
          </div>

          <div id="f-idPhoto-field">
            <FieldLabel
              htmlFor="f-idPhoto"
              label={t.idPhotoLabel(t[`id${idType}`])}
              altLabel={alt.idPhotoLabel(alt[`id${idType}`])}
              altLang={altLang}
              optional={t.optional}
            />
            {idPhoto ? (
              <div className="mt-2 flex items-center gap-3 rounded-xl border-2 border-line-strong bg-card p-2">
                {/* eslint-disable-next-line @next/next/no-img-element -- a local data URL, nothing to optimise */}
                <img src={idPhoto} alt={t.idPhotoAlt} className="h-20 w-28 shrink-0 rounded-lg object-cover" />
                <div className="flex flex-1 flex-wrap gap-2">
                  <label
                    htmlFor="f-idPhoto"
                    className="inline-flex h-10 cursor-pointer items-center rounded-full border-2 border-line-strong px-4 text-[15px] font-semibold"
                  >
                    {t.idPhotoChange}
                  </label>
                  <button
                    type="button"
                    onClick={() => setIdPhoto(null)}
                    className="inline-flex h-10 items-center rounded-full px-3 text-[15px] font-semibold text-danger"
                  >
                    {t.idPhotoRemove}
                  </button>
                </div>
              </div>
            ) : (
              <label
                htmlFor="f-idPhoto"
                className={`mt-2 flex h-[52px] cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed bg-card text-[16px] font-semibold ${
                  errors.idPhoto ? "border-danger" : "border-line-strong"
                }`}
              >
                <CameraIcon size={22} className="text-muted" />
                {photoBusy ? t.idPhotoReading : t.idPhotoAdd}
              </label>
            )}
            <input
              id="f-idPhoto"
              type="file"
              accept="image/*"
              className="sr-only"
              aria-describedby="idPhoto-hint"
              onChange={(e) => {
                const input = e.currentTarget;
                void onPhoto(input.files?.[0]).then(() => {
                  input.value = ""; // so choosing the same file again still works
                });
              }}
            />
            <p id="idPhoto-hint" className="mt-2 text-[13px] leading-snug text-muted">
              🔒 {t.idPhotoHint}
            </p>
            <FieldError id="idPhoto-error" message={err("idPhoto")} />
          </div>

          <div>
            <FieldLabel label={t.vehicle} altLabel={alt.vehicle} altLang={altLang} optional={t.optional} />
            <div className="mt-2">
              <ChoiceGroup
                name="vehicleType"
                options={vehicleChoices}
                value={vehicleType}
                onChange={(v) => {
                  setVehicleType(v);
                  clearError("vehicleNumber");
                }}
              />
            </div>
          </div>

          {vehicleType !== "NONE" ? (
            <div>
              <FieldLabel htmlFor="f-vehicleNumber" label={t.vehicleNumber} altLabel={alt.vehicleNumber} altLang={altLang} optional={t.optional} />
              <input
                id="f-vehicleNumber"
                className={`${inputClass} ${inputBorder(!!errors.vehicleNumber)} mt-2 uppercase tracking-wider`}
                value={vehicleNumber}
                autoCapitalize="characters"
                autoComplete="off"
                spellCheck={false}
                placeholder="RJ01 AB 1234"
                maxLength={20}
                onChange={(e) => {
                  setVehicleNumber(e.currentTarget.value.toUpperCase());
                  clearError("vehicleNumber");
                }}
              />
              <FieldError id="vehicleNumber-error" message={err("vehicleNumber")} />
            </div>
          ) : null}
        </Section>
      ) : null}

      <div className="space-y-3 pt-1">
        {formError === "network" || (formError === "fix" && Object.keys(errors).length > 0) ? (
          <div role="alert" className="flex items-start gap-2 rounded-2xl border border-danger/30 bg-danger-soft px-4 py-3 text-[15px] font-medium text-danger">
            <AlertIcon size={20} className="mt-0.5 shrink-0" />
            {formError === "network" ? t.networkError : t.fixErrors}
          </div>
        ) : null}
        <button
          type="submit"
          disabled={pending || photoBusy}
          className="flex h-[60px] w-full items-center justify-center gap-2 rounded-2xl bg-brand text-[21px] font-bold text-white shadow-[0_8px_20px_-8px_rgba(180,65,14,0.6)] transition hover:bg-brand-strong active:scale-[0.99] disabled:opacity-70"
        >
          {pending ? t.submitting : t.submit}
        </button>
        <p className="px-2 text-center text-[13px] leading-relaxed text-muted">{t.privacyNote}</p>
      </div>
    </form>
  );
}
