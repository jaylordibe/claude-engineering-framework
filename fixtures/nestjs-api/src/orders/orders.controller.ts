import { Controller, Get, Param } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { RequirePermission } from '../common/require-permission.decorator';

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get(':id')
  @RequirePermission('read', 'Order')
  findById(@Param('id') orderId: string) {
    return this.ordersService.findById(orderId);
  }
}
