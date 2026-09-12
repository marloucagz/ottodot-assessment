# Modular Prisma models

| File | Model |
|------|-------|
| `user.prisma` | `User` |
| `student.prisma` | `Student` |
| `learning-method.prisma` | `LearningMethod` |
| `level.prisma` | `Level` |
| `grade.prisma` | `Grade` |
| `subject.prisma` | `Subject` |
| `level-subject.prisma` | `LevelSubject` |
| `capability.prisma` | `Capability` |
| `booking.prisma` | `Booking` |
| `student-booking.prisma` | `StudentBooking` |
| `student-booking-subject.prisma` | `StudentBookingSubject` |
| `student-capability-selection.prisma` | `StudentCapabilitySelection` |
| `trial-class-slot.prisma` | `TrialClassSlot` |
| `slot-reservation.prisma` | `SlotReservation` |
| `payment.prisma` | `Payment` |

Generator and datasource live in `../schema.prisma`. Load the whole `prisma/` directory:

```bash
npx prisma validate --schema prisma
npm run prisma:generate
```
