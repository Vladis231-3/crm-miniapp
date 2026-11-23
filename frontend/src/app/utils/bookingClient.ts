import type { RegisteredClient } from '../context/AppContext';
import { normalizePlateInput, validatePhoneValue, validatePlateValue, type PlateType } from './validation';

type BookingClientFields = {
  clientId: string;
  clientPhone: string;
  plate: string;
  plateType: PlateType;
};

export function findBookingClient(clients: RegisteredClient[], fields: BookingClientFields): RegisteredClient | undefined {
  if (fields.clientId) return clients.find((client) => client.id === fields.clientId);

  if (fields.clientPhone.trim()) {
    if (validatePhoneValue(fields.clientPhone)) return undefined;
    const phone = fields.clientPhone.replace(/\D/g, '').slice(-10);
    const matches = clients.filter((client) => (
      !validatePhoneValue(client.phone) && client.phone.replace(/\D/g, '').slice(-10) === phone
    ));
    return matches.length === 1 ? matches[0] : undefined;
  }

  const plate = normalizePlateInput(fields.plate, fields.plateType);
  if (!plate || validatePlateValue(plate, fields.plateType)) return undefined;

  const matches = clients.filter((client) => [client, ...(client.vehicles ?? [])].some((vehicle) => (
    (vehicle.plateType || 'russian') === fields.plateType && normalizePlateInput(vehicle.plate, fields.plateType) === plate
  )));
  return matches.length === 1 ? matches[0] : undefined;
}
