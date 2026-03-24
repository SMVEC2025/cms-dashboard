import * as React from 'react';
import { DayPicker } from 'react-day-picker';
import clsx from 'clsx';
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import 'react-day-picker/dist/style.css';

const Calendar = React.forwardRef(({ className, classNames, showOutsideDays = true, ...props }, ref) => (
  <DayPicker
    ref={ref}
    showOutsideDays={showOutsideDays}
    className={clsx('ui-calendar', className)}
    classNames={{
      months: 'ui-calendar__months',
      month: 'ui-calendar__month',
      caption: 'ui-calendar__caption',
      caption_label: 'ui-calendar__caption-label',
      nav: 'ui-calendar__nav',
      button_previous: 'ui-calendar__nav-button ui-calendar__nav-button--prev',
      button_next: 'ui-calendar__nav-button ui-calendar__nav-button--next',
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
        ) : (
          <FiChevronRight className={iconClassName} {...iconProps} />
        ),
    }}
    {...props}
  />
));

Calendar.displayName = 'Calendar';

export { Calendar };
