import { useState } from "react";

const MONTHS = [
  { value: "01", label: "Jan" },
  { value: "02", label: "Feb" },
  { value: "03", label: "Mar" },
  { value: "04", label: "Apr" },
  { value: "05", label: "May" },
  { value: "06", label: "Jun" },
  { value: "07", label: "Jul" },
  { value: "08", label: "Aug" },
  { value: "09", label: "Sep" },
  { value: "10", label: "Oct" },
  { value: "11", label: "Nov" },
  { value: "12", label: "Dec" },
];

function splitDob(value: string) {
  const [year = "", month = "", day = ""] = value.split("-");
  return { year, month, day };
}

function padDay(value: string) {
  if (!value) return "";
  return value.padStart(2, "0").slice(0, 2);
}

function daysInMonth(yearText: string, monthText: string) {
  const month = Number(monthText);
  if (!month) return 31;
  if ([4, 6, 9, 11].includes(month)) return 30;
  if (month !== 2) return 31;

  const year = Number(yearText);
  if (!year) return 29;
  const leapYear = year % 400 === 0 || (year % 4 === 0 && year % 100 !== 0);
  return leapYear ? 29 : 28;
}

function dayValidationMessage(dayText: string, yearText: string, monthText: string) {
  if (!dayText) return "";
  const day = Number(dayText);
  if (!/^\d{1,2}$/.test(dayText) || day < 1) return "Enter a day from 1 to 31";
  const maxDay = daysInMonth(yearText, monthText);
  if (day > maxDay) {
    const monthName = MONTHS.find((item) => item.value === monthText)?.label ?? "this month";
    return `${monthName} has only ${maxDay} days`;
  }
  return "";
}

export function validateAdultDob(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return "Please enter full date of birth";

  const [yearText, monthText, dayText] = value.split("-");
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const birthDate = new Date(year, month - 1, day);
  const isRealDate =
    birthDate.getFullYear() === year &&
    birthDate.getMonth() === month - 1 &&
    birthDate.getDate() === day;

  if (!isRealDate) return "Please enter a valid date of birth";

  const today = new Date();
  const eighteenthBirthday = new Date(year + 18, month - 1, day);
  if (eighteenthBirthday > today) return "Entry is only for 18+ users";

  return null;
}

export function BirthDateFields({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const { year, month, day } = splitDob(value);
  const visibleDay = day === "00" ? "" : day;
  const [dayTouched, setDayTouched] = useState(false);
  const dayError = dayTouched ? dayValidationMessage(visibleDay, year, month) : "";

  function update(part: "year" | "month" | "day", nextValue: string) {
    const next = {
      year,
      month,
      day,
      [part]: part === "day" ? nextValue.replace(/\D/g, "").slice(0, 2) : nextValue,
    };
    onChange(`${next.year}-${next.month}-${next.day}`);
  }

  function formatDayOnBlur() {
    setDayTouched(true);
    if (!visibleDay) return;
    const numericDay = Number(visibleDay);
    if (numericDay >= 1 && numericDay <= daysInMonth(year, month)) {
      update("day", padDay(String(numericDay)));
    }
  }

  return (
    <div className="grid gap-1">
      <div className="grid grid-cols-[1.1fr_1fr_0.85fr] gap-2">
        <input
          type="number"
          inputMode="numeric"
          min="1900"
          max={new Date().getFullYear() - 18}
          value={year}
          onChange={(e) => update("year", e.target.value.slice(0, 4))}
          placeholder="Year"
          className="min-h-11 rounded-2xl bg-input px-3 text-xs outline-none"
        />
        <select
          value={month}
          onChange={(e) => update("month", e.target.value)}
          className="min-h-11 rounded-2xl bg-input px-3 text-xs outline-none"
        >
          <option value="">Month</option>
          {MONTHS.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={2}
          value={visibleDay}
          onChange={(e) => update("day", e.target.value)}
          onBlur={formatDayOnBlur}
          onFocus={() => setDayTouched(false)}
          placeholder="DD"
          aria-invalid={Boolean(dayError)}
          className="min-h-11 rounded-2xl bg-input px-3 text-xs outline-none"
        />
      </div>
      {dayError && <p className="px-1 text-[10px] font-semibold text-rose-300">{dayError}</p>}
    </div>
  );
}

export function ProfileFields({
  gender,
  setGender,
  dob,
  setDob,
}: {
  gender: string;
  setGender: (value: string) => void;
  dob: string;
  setDob: (value: string) => void;
}) {
  return (
    <div className="grid gap-2">
      <select
        value={gender}
        onChange={(e) => setGender(e.target.value)}
        className="min-h-11 rounded-2xl bg-input px-3 text-xs outline-none"
      >
        <option value="">Gender</option>
        <option value="female">Female</option>
        <option value="male">Male</option>
      </select>
      <BirthDateFields value={dob} onChange={setDob} />
      <p className="px-1 text-[10px] font-semibold text-slate-400">18+ only. Enter birth year directly.</p>
    </div>
  );
}
