import * as React from 'react';
import { DayPicker } from 'react-day-picker';
import clsx from 'clsx';
import { FiChevronDown, FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import 'react-day-picker/dist/style.css';

const Calendar = React.forwardRef(({
  className,
  classNames,
  showOutsideDays = true,
  captionLayout = 'dropdown',
  navLayout = 'around',
  startMonth = new Date(2000, 0),
  endMonth = new Date(2100, 11),
  ...props
}, ref) => (
  <DayPicker
    ref={ref}
    showOutsideDays={showOutsideDays}
    captionLayout={captionLayout}
    navLayout={navLayout}
    startMonth={startMonth}
    endMonth={endMonth}
    className={clsx('ui-calendar', className)}
    classNames={{
      months: 'ui-calendar__months',
      month: 'ui-calendar__month',
      month_caption: 'ui-calendar__caption',
      caption_label: 'ui-calendar__caption-label',
      dropdowns: 'ui-calendar__dropdowns',
      dropdown_root: 'ui-calendar__dropdown-root',
      dropdown: 'ui-calendar__dropdown',
      months_dropdown: 'ui-calendar__months-dropdown',
      years_dropdown: 'ui-calendar__years-dropdown',
      nav: 'ui-calendar__nav',
      button_previous: 'ui-calendar__nav-button ui-calendar__nav-button--prev',
      button_next: 'ui-calendar__nav-button ui-calendar__nav-button--next',
      chevron: 'ui-calendar__chevron',
      month_grid: 'ui-calendar__month-grid',
      weekdays: 'ui-calendar__weekdays',
      weekday: 'ui-calendar__weekday',
      week: 'ui-calendar__week',
      day: 'ui-calendar__day',
      day_button: 'ui-calendar__day-button',
      selected: 'is-selected',
      today: 'is-today',
      outside: 'is-outside',
      disabled: 'is-disabled',
      hidden: 'is-hidden',
      ...classNames,
    }}
    components={{
      Chevron: ({ orientation, className: iconClassName, ...iconProps }) =>
        orientation === 'left' ? (
          <FiChevronLeft className={iconClassName} {...iconProps} />
        ) : orientation === 'right' ? (
          <FiChevronRight className={iconClassName} {...iconProps} />
        ) : (
          <FiChevronDown className={iconClassName} {...iconProps} />
        ),
    }}
    {...props}
  />
));

Calendar.displayName = 'Calendar';

export { Calendar };
