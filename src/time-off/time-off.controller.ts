import { Body, Controller, Delete, Get, Param, Post, Query } from '@nestjs/common';
import { CreateTimeOffRequestDto } from './dto/create-time-off-request.dto';
import { TimeOffService } from './time-off.service';

@Controller('time-off')
export class TimeOffController {
  constructor(private readonly timeOffService: TimeOffService) {}

  @Post('requests')
  createRequest(@Body() dto: CreateTimeOffRequestDto) {
    return this.timeOffService.createRequest(dto);
  }

  @Get('balances')
  getBalances(@Query('employeeId') employeeId?: string) {
    return this.timeOffService.getBalances(employeeId);
  }

  @Post('requests/:id/approve')
  approveRequest(@Param('id') id: string) {
    return this.timeOffService.approveRequest(id);
  }

  @Post('requests/:id/reject')
  rejectRequest(@Param('id') id: string, @Body() dto: { reason?: string }) {
    return this.timeOffService.rejectRequest(id, dto.reason);
  }

  @Delete('requests/:id')
  cancelRequest(@Param('id') id: string) {
    return this.timeOffService.cancelRequest(id);
  }
}
