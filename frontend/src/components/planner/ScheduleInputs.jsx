import {weekdays} from './entityConfig';
export {DatePicker,TimePicker,MonthPicker} from './PickerPopover';
export function WeekdayPicker({id,value,onChange,label}){
 return <div className="studio-field wide"><span id={`${id}-label`}>{label}</span><div className="schedule-weekdays" role="radiogroup" aria-labelledby={`${id}-label`}>{[1,2,3,4,5,6,0].map(day=><label key={day} title={weekdays[day]}><input type="radio" name={id} value={day} checked={String(value)===String(day)} onChange={()=>onChange(day)}/><span>{weekdays[day].slice(0,3)}</span></label>)}</div></div>;
}
