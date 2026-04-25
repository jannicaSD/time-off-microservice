import { Employee } from './employee.entity';
import { Location } from './location.entity';
import { TimeOffBalance } from './time-off-balance.entity';
import { TimeOffRequestHistory } from './time-off-request-history.entity';
import { TimeOffRequest, TimeOffRequestStatus } from './time-off-request.entity';

describe('Entities', () => {
  it('instantiates entity classes', () => {
    expect(new Employee()).toBeInstanceOf(Employee);
    expect(new Location()).toBeInstanceOf(Location);
    expect(new TimeOffBalance()).toBeInstanceOf(TimeOffBalance);
    expect(new TimeOffRequest()).toBeInstanceOf(TimeOffRequest);
    expect(new TimeOffRequestHistory()).toBeInstanceOf(TimeOffRequestHistory);
    expect(TimeOffRequestStatus.SUBMITTED).toBe('SUBMITTED');
    expect(TimeOffRequestStatus.REJECTED).toBe('REJECTED');
  });
});
