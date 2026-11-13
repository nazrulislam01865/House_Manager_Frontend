export type User = { id: string; name: string; username?: string; phone: string; version: number; organizationName?: string; currency?: string; timezone?: string };
export type House = {
  id: string;
  name: string;
  address: string;
  version: number;
  archived: boolean;
  roomCount: number;
  occupied: number;
  managers: { id: string; name: string }[];
};
export type Manager = User & {
  nid: string;
  active: boolean;
  houses: { id: string; name: string }[];
};
export type Room = {
  id: string;
  houseId: string;
  houseName: string;
  number: string;
  rentMinor: string;
  version: number;
  residentName?: string;
  residentId?: string;
  tenancyId?: string;
  meter?: string;
  installationId?: string;
};
export type Resident = User & {
  active: boolean;
  roomId?: string;
  roomNumber?: string;
  houseName?: string;
  houseId?: string;
  tenancyId?: string;
  moveIn?: string;
  rentMinor?: string;
  meter?: string;
};
export type Bill = {
  id: string;
  type: "rent" | "electricity";
  month: string;
  dueDate: string;
  amountMinor: string;
  paidMinor: string;
  remainingMinor: string;
  version: number;
  roomId: string;
  roomNumber: string;
  residentName: string;
  houseId: string;
  houseName: string;
  meter?: string;
  previous?: string;
  current?: string;
  usage?: string;
  rate?: string;
};
export type Payment = {
  id: string;
  billId: string;
  receiptNumber: string;
  amountMinor: string;
  kind: string;
  type: string;
  month: string;
  receivedAt: string;
  recordedAt: string;
  method: string;
  residentName: string;
  houseName: string;
  roomNumber: string;
  reversed: boolean;
};
export type Page<T> = {
  data: T[];
  meta: { page: number; limit: number; total: number; pages: number };
};
export type Summary = {
  amountMinor: string;
  paidMinor: string;
  remainingMinor: string;
  count: number;
  due: number;
};
export type Dashboard = {
  houses: number;
  rooms: number;
  occupied: number;
  vacant: number;
  rent: Summary;
  electricity: Summary;
  asOf: string;
};
