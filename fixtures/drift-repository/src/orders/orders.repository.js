import { MongoClient, ObjectId } from 'mongodb';

const client = new MongoClient(process.env.MONGODB_URI);
const orders = client.db('shop').collection('orders');

// Totals are stored as a floating-point `total` field in the document.
// There is no `totalCents` anywhere in this collection.
export async function findById(orderId) {
  return orders.findOne({ _id: new ObjectId(orderId) });
}

export async function listForBusiness(businessId) {
  return orders.find({ businessId }).toArray();
}

export async function markPaid(orderId) {
  return orders.updateOne({ _id: new ObjectId(orderId) }, { $set: { isPaid: true } });
}
