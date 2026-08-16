import { ACCESS_AREAS, defaultAccessAreas } from './dto/create-user.dto';

describe('user access defaults', () => {
  it('gives administrators every operational area', () => {
    expect(defaultAccessAreas('ADMIN')).toEqual([...ACCESS_AREAS]);
  });

  it('limits operators to the dashboard and operation', () => {
    expect(defaultAccessAreas('OPERATOR')).toEqual(['dashboard', 'operations']);
  });

  it('limits foremen to dashboard and reports', () => {
    expect(defaultAccessAreas('FOREMAN')).toEqual(['dashboard', 'reports']);
  });
});
