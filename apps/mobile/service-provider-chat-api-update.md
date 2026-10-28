# Service Provider Chat, Booking API updates

Last reviewed: 2026-10-27

Here are the main API updates included in this deployment:

1.⁠ ⁠Request Summary API
GET /api/v1/service-provider/requests/{invitation_id}/summary

schedule.drop_off and schedule.pick_up have been removed. Use schedule.start_time and schedule.end_time instead. schedule.dates remains unchanged.

2.⁠ ⁠Chat Inbox API
GET /api/v1/service-provider/chats

Response fields remain the same, including status_label, status_key, and last_message.

Cancelled bookings now use booking_cancelled instead of expired.

The active status excludes cancelled bookings and requests that are past the start time but still allow cancellation.

Please don’t use last_message to determine the chat status.

3.⁠ ⁠Chat Status Filter
GET /api/v1/service-provider/chats?status_key={key}

Filtering now matches each chat’s status_key, keeping the results consistent with the status pills in the Inbox.

Existing filter keys remain unchanged, including active, offer_in_progress, expired, booking_cancelled, and request_cancelled.

4.⁠ ⁠Paid Booking Cancellation

When a provider cancels a paid booking, the invitation status is now updated to closed instead of sometimes remaining accepted.

The booking’s execution_status is also reset after cancellation.

In the summary response, invitation_status may now be closed.
