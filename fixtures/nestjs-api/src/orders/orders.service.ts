import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { OrderResponseDto } from './order-response.dto';

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async findById(orderId: string): Promise<OrderResponseDto> {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, deletedAt: null },
    });
    return new OrderResponseDto(order);
  }
}
