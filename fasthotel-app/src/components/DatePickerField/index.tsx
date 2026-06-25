import React from 'react';
import ReactDatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import './styles.css';

const MONTHS = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 120 }, (_, i) => currentYear - 100 + i).reverse();

function parseDate(val: string): Date | null {
  if (!val) return null;
  const [y, m, d] = val.split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

function formatDate(d: Date | null): string {
  if (!d) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

interface DatePickerFieldProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  disabled?: boolean;
  minDate?: Date;
  maxDate?: Date;
  name?: string;
  placeholder?: string;
  error?: string;
}

const DatePickerField: React.FC<DatePickerFieldProps> = ({
  label,
  value,
  onChange,
  required,
  disabled,
  minDate,
  maxDate,
  name,
  placeholder = 'DD/MM/AAAA',
  error,
}) => {
  const selected = parseDate(value);

  return (
    <div className="dp-wrapper">
      {label && <label className="dp-label">{label}</label>}
      <ReactDatePicker
        selected={selected}
        onChange={(date) => onChange(formatDate(date as Date | null))}
        dateFormat="dd/MM/yyyy"
        placeholderText={placeholder}
        required={required}
        disabled={disabled}
        minDate={minDate}
        maxDate={maxDate}
        name={name}
        showPopperArrow={false}
        todayButton="Hoje"
        renderCustomHeader={({
          date,
          changeYear,
          changeMonth,
          decreaseMonth,
          increaseMonth,
          prevMonthButtonDisabled,
          nextMonthButtonDisabled,
        }) => (
          <div className="dp-header">
            <button
              type="button"
              className="dp-nav-btn"
              onClick={decreaseMonth}
              disabled={prevMonthButtonDisabled}
            >
              ‹
            </button>
            <div className="dp-header-selects">
              <select
                value={date.getMonth()}
                onChange={(e) => changeMonth(Number(e.target.value))}
              >
                {MONTHS.map((m, i) => (
                  <option key={m} value={i}>{m}</option>
                ))}
              </select>
              <select
                value={date.getFullYear()}
                onChange={(e) => changeYear(Number(e.target.value))}
              >
                {YEARS.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
            <button
              type="button"
              className="dp-nav-btn"
              onClick={increaseMonth}
              disabled={nextMonthButtonDisabled}
            >
              ›
            </button>
          </div>
        )}
      />
      {error && <p style={{ color: '#dc2626', fontSize: '12px', marginTop: '3px' }}>{error}</p>}
    </div>
  );
};

export default DatePickerField;
