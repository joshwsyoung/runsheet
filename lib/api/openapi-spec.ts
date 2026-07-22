/** OpenAPI 3.0 document for Runsheet HTTP API v1 (machine + human readable). */
export const openApiSpec = {
  openapi: "3.0.3",
  info: {
    title: "Runsheet API",
    version: "1.0.0",
    description:
      "REST API for runsheets, calendar days, itinerary slots, checklists, and invites. " +
      "All routes require a Supabase user access token (same JWT the web app uses after sign-in).",
  },
  servers: [{ url: "/", description: "Same origin as the Next.js app (e.g. https://your-app.vercel.app)" }],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description: "Supabase `access_token` from `signInWithPassword` or session refresh.",
      },
    },
    schemas: {
      Runsheet: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          title: { type: "string" },
          owner_id: { type: "string", format: "uuid" },
          timezone: { type: "string", description: "IANA zone, e.g. Europe/London" },
          start_date: { type: "string", format: "date", description: "Inclusive trip first day YYYY-MM-DD" },
          end_date: { type: "string", format: "date", description: "Inclusive trip last day YYYY-MM-DD" },
          hero_image_url: { type: "string", nullable: true, description: "Optional trip planner hero image URL" },
          created_at: { type: "string", format: "date-time" },
          archived_at: { type: "string", format: "date-time", nullable: true },
        },
      },
      RunsheetDay: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          runsheet_id: { type: "string", format: "uuid" },
          day_date: { type: "string", format: "date", description: "YYYY-MM-DD" },
          label: { type: "string", nullable: true },
          is_special: { type: "boolean" },
        },
      },
      SlotTodoItem: {
        type: "object",
        description: "Structured slot to-do with stable id for toggling completion",
        properties: {
          id: { type: "string", format: "uuid", description: "Omitted on create = server assigns id" },
          text: { type: "string" },
          done: { type: "boolean" },
        },
        required: ["text"],
      },
      Slot: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          day_id: { type: "string", format: "uuid" },
          start_at: { type: "string", format: "date-time" },
          end_at: { type: "string", format: "date-time" },
          activity_type: {
            type: "string",
            enum: [
              "hotel",
              "flight",
              "taxi",
              "boat",
              "driving",
              "rental_car",
              "hotel_checkin",
              "dinner",
              "lunch",
              "breakfast",
              "activity",
              "other",
            ],
          },
          title: { type: "string", nullable: true },
          description: { type: "string", nullable: true },
          description_bullets: { type: "array", items: { type: "string" } },
          todos: {
            description:
              "Prep to-dos: legacy string lines, or objects { id?, text, done? }. Responses may include either shape until migrated.",
            type: "array",
            items: {
              oneOf: [{ type: "string" }, { $ref: "#/components/schemas/SlotTodoItem" }],
            },
          },
          from_location: { type: "string", nullable: true },
          to_location: { type: "string", nullable: true },
          flight_number: { type: "string", nullable: true },
          location_name: { type: "string", nullable: true },
          map_url: { type: "string", nullable: true },
          link_url: { type: "string", nullable: true },
          booking_ref: { type: "string", nullable: true },
          contact_info: { type: "string", nullable: true },
          flight_meta: { type: "object", nullable: true, additionalProperties: { type: "string" } },
          attachment_urls: { type: "array", nullable: true, items: { type: "string" } },
          open_ended: { type: "boolean" },
          preview_title: { type: "string", nullable: true },
          preview_description: { type: "string", nullable: true },
          preview_image_url: { type: "string", nullable: true },
          preview_fetched_at: { type: "string", format: "date-time", nullable: true },
          sort_order: { type: "integer" },
          created_at: { type: "string", format: "date-time" },
          updated_at: { type: "string", format: "date-time" },
        },
      },
      ChecklistItem: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          day_id: { type: "string", format: "uuid" },
          label: { type: "string" },
          done: { type: "boolean" },
          sort_order: { type: "integer" },
        },
      },
      Invite: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          runsheet_id: { type: "string", format: "uuid" },
          email: { type: "string" },
          role: { type: "string", enum: ["editor", "viewer"] },
          token: { type: "string" },
          invited_by: { type: "string", format: "uuid" },
          created_at: { type: "string", format: "date-time" },
          accepted_at: { type: "string", format: "date-time", nullable: true },
        },
      },
    },
    parameters: {
      runId: { name: "runsheetId", in: "path", required: true, schema: { type: "string", format: "uuid" } },
      slotId: { name: "slotId", in: "path", required: true, schema: { type: "string", format: "uuid" } },
    },
  },
  security: [{ bearerAuth: [] }],
  paths: {
    "/api/v1/me": {
      get: {
        summary: "Current user",
        responses: { "200": { description: "User id and email" } },
      },
    },
    "/api/v1/runsheets": {
      get: { summary: "List non-archived runsheets you can access", responses: { "200": { description: "OK" } } },
      post: {
        summary: "Create runsheet",
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["title", "start_date", "end_date"],
                properties: {
                  title: { type: "string" },
                  timezone: { type: "string" },
                  start_date: { type: "string", format: "date" },
                  end_date: { type: "string", format: "date" },
                },
              },
            },
          },
        },
        responses: { "201": { description: "Created" } },
      },
    },
    "/api/v1/runsheets/{runsheetId}": {
      get: { summary: "Get runsheet", parameters: [{ $ref: "#/components/parameters/runId" }] },
      patch: {
        summary: "Update title/timezone/trip bounds",
        parameters: [{ $ref: "#/components/parameters/runId" }],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  timezone: { type: "string" },
                  start_date: { type: "string", format: "date" },
                  end_date: { type: "string", format: "date" },
                },
              },
            },
          },
        },
      },
      delete: { summary: "Archive runsheet", parameters: [{ $ref: "#/components/parameters/runId" }] },
    },
    "/api/v1/runsheets/{runsheetId}/days": {
      get: {
        summary: "List days",
        parameters: [
          { $ref: "#/components/parameters/runId" },
          { name: "from", in: "query", schema: { type: "string", format: "date" } },
          { name: "to", in: "query", schema: { type: "string", format: "date" } },
        ],
      },
      post: {
        summary: "Upsert day rows for dates",
        parameters: [{ $ref: "#/components/parameters/runId" }],
        requestBody: {
          content: {
            "application/json": {
              schema: { type: "object", required: ["dates"], properties: { dates: { type: "array", items: { type: "string" } } } },
            },
          },
        },
      },
    },
    "/api/v1/runsheets/{runsheetId}/slots": {
      get: {
        summary: "List slots for one calendar day",
        parameters: [
          { $ref: "#/components/parameters/runId" },
          { name: "day", in: "query", required: true, schema: { type: "string", example: "2026-05-21" } },
        ],
      },
      post: {
        summary: "Create slot",
        parameters: [{ $ref: "#/components/parameters/runId" }],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["dayYmd", "title"],
                properties: {
                  dayYmd: { type: "string" },
                  startHm: { type: "string", default: "09:00" },
                  endHm: { type: "string", nullable: true },
                  title: { type: "string" },
                  activityType: { type: "string" },
                  description: { type: "string" },
                  descriptionBullets: { type: "array", items: { type: "string" } },
                  linkUrl: { type: "string" },
                  bookingRef: { type: "string" },
                  contactInfo: { type: "string" },
                  openEnd: { type: "boolean" },
                  flightMeta: { type: "object", additionalProperties: { type: "string" } },
                  attachmentUrls: { type: "array", items: { type: "string" } },
                  todos: {
                    type: "array",
                    description: "String lines (all unchecked) or SlotTodoItem objects",
                    items: {
                      oneOf: [{ type: "string" }, { $ref: "#/components/schemas/SlotTodoItem" }],
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/api/v1/runsheets/{runsheetId}/slots/{slotId}": {
      get: { summary: "Get slot", parameters: [{ $ref: "#/components/parameters/runId" }, { $ref: "#/components/parameters/slotId" }] },
      patch: {
        summary: "Update slot",
        parameters: [{ $ref: "#/components/parameters/runId" }, { $ref: "#/components/parameters/slotId" }],
      },
      delete: {
        summary: "Delete slot",
        parameters: [{ $ref: "#/components/parameters/runId" }, { $ref: "#/components/parameters/slotId" }],
      },
    },
    "/api/v1/runsheets/{runsheetId}/checklist": {
      get: {
        summary: "List checklist items for a day",
        parameters: [
          { $ref: "#/components/parameters/runId" },
          { name: "day", in: "query", required: true, schema: { type: "string" } },
        ],
      },
      post: {
        summary: "Add checklist item",
        parameters: [{ $ref: "#/components/parameters/runId" }],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["dayYmd", "label"],
                properties: { dayYmd: { type: "string" }, label: { type: "string" } },
              },
            },
          },
        },
      },
    },
    "/api/v1/runsheets/{runsheetId}/checklist/{itemId}": {
      patch: {
        summary: "Update checklist item (done / label)",
        parameters: [
          { $ref: "#/components/parameters/runId" },
          { name: "itemId", in: "path", required: true, schema: { type: "string", format: "uuid" } },
        ],
      },
      delete: {
        summary: "Delete checklist item",
        parameters: [
          { $ref: "#/components/parameters/runId" },
          { name: "itemId", in: "path", required: true, schema: { type: "string", format: "uuid" } },
        ],
      },
    },
    "/api/v1/runsheets/{runsheetId}/invites": {
      get: { summary: "List pending invites (owner only)", parameters: [{ $ref: "#/components/parameters/runId" }] },
      post: {
        summary: "Create invite (owner only)",
        parameters: [{ $ref: "#/components/parameters/runId" }],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email"],
                properties: { email: { type: "string" }, role: { type: "string", enum: ["editor", "viewer"] } },
              },
            },
          },
        },
      },
    },
  },
} as const;
