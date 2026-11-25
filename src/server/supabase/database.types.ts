
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "candles": {
                  Row: {
                    "created_at": string,"day": string,"memorial_id": string,"visitor_hash": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"day": string,"memorial_id": string,"visitor_hash": string
                  }
                  Update: {
                    "created_at"?: string,"day"?: string,"memorial_id"?: string,"visitor_hash"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "candles_memorial_id_fkey"
      columns: ["memorial_id"]
isOneToOne: false
      referencedRelation: "memorials"
      referencedColumns: ["id"]
    }
                  ]
                },"donation_entries": {
                  Row: {
                    "amount_cents": number,"created_at": string,"id": string,"order_line_id": string,"shelter_id": string | null,"status": string
                  }
                  ComputedFields: never
                  Insert: {
                    "amount_cents": number,"created_at"?: string,"id"?: string,"order_line_id": string,"shelter_id"?: string | null,"status"?: string
                  }
                  Update: {
                    "amount_cents"?: number,"created_at"?: string,"id"?: string,"order_line_id"?: string,"shelter_id"?: string | null,"status"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "donation_entries_order_line_id_fkey"
      columns: ["order_line_id"]
isOneToOne: true
      referencedRelation: "order_lines"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "donation_entries_shelter_id_fkey"
      columns: ["shelter_id"]
isOneToOne: false
      referencedRelation: "shelters"
      referencedColumns: ["id"]
    }
                  ]
                },"donation_payouts": {
                  Row: {
                    "amount_cents": number,"created_at": string,"id": string,"note": string | null,"paid_on": string,"proof_path": string | null,"published": boolean,"shelter_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "amount_cents": number,"created_at"?: string,"id"?: string,"note"?: string | null,"paid_on": string,"proof_path"?: string | null,"published"?: boolean,"shelter_id": string
                  }
                  Update: {
                    "amount_cents"?: number,"created_at"?: string,"id"?: string,"note"?: string | null,"paid_on"?: string,"proof_path"?: string | null,"published"?: boolean,"shelter_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "donation_payouts_shelter_id_fkey"
      columns: ["shelter_id"]
isOneToOne: false
      referencedRelation: "shelters"
      referencedColumns: ["id"]
    }
                  ]
                },"draft_claims": {
                  Row: {
                    "anon_user_id": string,"created_at": string,"token_hash": string
                  }
                  ComputedFields: never
                  Insert: {
                    "anon_user_id": string,"created_at"?: string,"token_hash": string
                  }
                  Update: {
                    "anon_user_id"?: string,"created_at"?: string,"token_hash"?: string
                  }
                  Relationships: [
                    
                  ]
                },"entitlements": {
                  Row: {
                    "applied_at": string | null,"created_at": string,"id": string,"memorial_id": string | null,"order_line_id": string,"owner_id": string | null,"status": string,"tier": string
                  }
                  ComputedFields: never
                  Insert: {
                    "applied_at"?: string | null,"created_at"?: string,"id"?: string,"memorial_id"?: string | null,"order_line_id": string,"owner_id"?: string | null,"status"?: string,"tier": string
                  }
                  Update: {
                    "applied_at"?: string | null,"created_at"?: string,"id"?: string,"memorial_id"?: string | null,"order_line_id"?: string,"owner_id"?: string | null,"status"?: string,"tier"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "entitlements_memorial_id_fkey"
      columns: ["memorial_id"]
isOneToOne: false
      referencedRelation: "memorials"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "entitlements_order_line_id_fkey"
      columns: ["order_line_id"]
isOneToOne: false
      referencedRelation: "order_lines"
      referencedColumns: ["id"]
    }
                  ]
                },"gestures": {
                  Row: {
                    "created_at": string,"display_name": string,"expires_at": string,"id": string,"kind": string,"memorial_id": string,"message": string | null,"order_line_id": string | null,"starts_at": string,"status": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"display_name": string,"expires_at": string,"id"?: string,"kind": string,"memorial_id": string,"message"?: string | null,"order_line_id"?: string | null,"starts_at"?: string,"status"?: string
                  }
                  Update: {
                    "created_at"?: string,"display_name"?: string,"expires_at"?: string,"id"?: string,"kind"?: string,"memorial_id"?: string,"message"?: string | null,"order_line_id"?: string | null,"starts_at"?: string,"status"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "gestures_memorial_id_fkey"
      columns: ["memorial_id"]
isOneToOne: false
      referencedRelation: "memorials"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "gestures_order_line_id_fkey"
      columns: ["order_line_id"]
isOneToOne: false
      referencedRelation: "order_lines"
      referencedColumns: ["id"]
    }
                  ]
                },"gifts": {
                  Row: {
                    "buyer_name": string | null,"code": string,"created_at": string,"entitlement_id": string,"id": string,"message": string | null,"order_line_id": string,"recipient_email": string,"recipient_name": string | null,"redeemed_at": string | null,"redeemed_by": string | null,"send_at": string,"sent_at": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "buyer_name"?: string | null,"code": string,"created_at"?: string,"entitlement_id": string,"id"?: string,"message"?: string | null,"order_line_id": string,"recipient_email": string,"recipient_name"?: string | null,"redeemed_at"?: string | null,"redeemed_by"?: string | null,"send_at"?: string,"sent_at"?: string | null
                  }
                  Update: {
                    "buyer_name"?: string | null,"code"?: string,"created_at"?: string,"entitlement_id"?: string,"id"?: string,"message"?: string | null,"order_line_id"?: string,"recipient_email"?: string,"recipient_name"?: string | null,"redeemed_at"?: string | null,"redeemed_by"?: string | null,"send_at"?: string,"sent_at"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "gifts_entitlement_id_fkey"
      columns: ["entitlement_id"]
isOneToOne: false
      referencedRelation: "entitlements"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "gifts_order_line_id_fkey"
      columns: ["order_line_id"]
isOneToOne: true
      referencedRelation: "order_lines"
      referencedColumns: ["id"]
    }
                  ]
                },"guestbook_entries": {
                  Row: {
                    "author_email": string | null,"author_name": string,"body": string,"created_at": string,"id": string,"ip_hash": string | null,"memorial_id": string,"moderated_at": string | null,"status": string
                  }
                  ComputedFields: never
                  Insert: {
                    "author_email"?: string | null,"author_name": string,"body": string,"created_at"?: string,"id"?: string,"ip_hash"?: string | null,"memorial_id": string,"moderated_at"?: string | null,"status"?: string
                  }
                  Update: {
                    "author_email"?: string | null,"author_name"?: string,"body"?: string,"created_at"?: string,"id"?: string,"ip_hash"?: string | null,"memorial_id"?: string,"moderated_at"?: string | null,"status"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "guestbook_entries_memorial_id_fkey"
      columns: ["memorial_id"]
isOneToOne: false
      referencedRelation: "memorials"
      referencedColumns: ["id"]
    }
                  ]
                },"letters": {
                  Row: {
                    "author_id": string,"body": string,"created_at": string,"id": string,"memorial_id": string,"title": string | null,"updated_at": string,"visibility": string,"written_on": string
                  }
                  ComputedFields: never
                  Insert: {
                    "author_id": string,"body": string,"created_at"?: string,"id"?: string,"memorial_id": string,"title"?: string | null,"updated_at"?: string,"visibility"?: string,"written_on"?: string
                  }
                  Update: {
                    "author_id"?: string,"body"?: string,"created_at"?: string,"id"?: string,"memorial_id"?: string,"title"?: string | null,"updated_at"?: string,"visibility"?: string,"written_on"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "letters_memorial_id_fkey"
      columns: ["memorial_id"]
isOneToOne: false
      referencedRelation: "memorials"
      referencedColumns: ["id"]
    }
                  ]
                },"memorial_members": {
                  Row: {
                    "accepted_at": string | null,"created_at": string,"invite_token_hash": string | null,"invited_email": string,"memorial_id": string,"role": string,"user_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "accepted_at"?: string | null,"created_at"?: string,"invite_token_hash"?: string | null,"invited_email": string,"memorial_id": string,"role"?: string,"user_id"?: string | null
                  }
                  Update: {
                    "accepted_at"?: string | null,"created_at"?: string,"invite_token_hash"?: string | null,"invited_email"?: string,"memorial_id"?: string,"role"?: string,"user_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "memorial_members_memorial_id_fkey"
      columns: ["memorial_id"]
isOneToOne: false
      referencedRelation: "memorials"
      referencedColumns: ["id"]
    }
                  ]
                },"memorial_photos": {
                  Row: {
                    "caption": string | null,"created_at": string,"created_by": string | null,"height": number | null,"id": string,"kind": string,"memorial_id": string,"sort_order": number,"source_photo_id": string | null,"storage_path": string,"taken_on": string | null,"width": number | null
                  }
                  ComputedFields: never
                  Insert: {
                    "caption"?: string | null,"created_at"?: string,"created_by"?: string | null,"height"?: number | null,"id"?: string,"kind"?: string,"memorial_id": string,"sort_order"?: number,"source_photo_id"?: string | null,"storage_path": string,"taken_on"?: string | null,"width"?: number | null
                  }
                  Update: {
                    "caption"?: string | null,"created_at"?: string,"created_by"?: string | null,"height"?: number | null,"id"?: string,"kind"?: string,"memorial_id"?: string,"sort_order"?: number,"source_photo_id"?: string | null,"storage_path"?: string,"taken_on"?: string | null,"width"?: number | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "memorial_photos_memorial_id_fkey"
      columns: ["memorial_id"]
isOneToOne: false
      referencedRelation: "memorials"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "memorial_photos_source_photo_id_fkey"
      columns: ["source_photo_id"]
isOneToOne: false
      referencedRelation: "memorial_photos"
      referencedColumns: ["id"]
    }
                  ]
                },"memorials": {
                  Row: {
                    "adoption_date": string | null,"attribution": Json | null,"birth_date": string | null,"birth_precision": string,"breed": string | null,"candle_count": number,"cover_photo_id": string | null,"created_at": string,"death_date": string | null,"death_precision": string,"dedication": string | null,"draft_step": number,"favorite_place": string | null,"favorite_toy": string | null,"favorite_treat": string | null,"funny_habits": string | null,"guestbook_mode": string,"id": string,"name": string,"nicknames": (string)[],"owner_id": string,"published_at": string | null,"sex": string | null,"share_key": string,"slug": string,"species": string | null,"status": string,"story_md": string | null,"theme": string,"tier": string,"traits": (string)[],"updated_at": string,"video_url": string | null,"visibility": string
                  }
                  ComputedFields: never
                  Insert: {
                    "adoption_date"?: string | null,"attribution"?: Json | null,"birth_date"?: string | null,"birth_precision"?: string,"breed"?: string | null,"candle_count"?: number,"cover_photo_id"?: string | null,"created_at"?: string,"death_date"?: string | null,"death_precision"?: string,"dedication"?: string | null,"draft_step"?: number,"favorite_place"?: string | null,"favorite_toy"?: string | null,"favorite_treat"?: string | null,"funny_habits"?: string | null,"guestbook_mode"?: string,"id"?: string,"name"?: string,"nicknames"?: (string)[],"owner_id": string,"published_at"?: string | null,"sex"?: string | null,"share_key"?: string,"slug": string,"species"?: string | null,"status"?: string,"story_md"?: string | null,"theme"?: string,"tier"?: string,"traits"?: (string)[],"updated_at"?: string,"video_url"?: string | null,"visibility"?: string
                  }
                  Update: {
                    "adoption_date"?: string | null,"attribution"?: Json | null,"birth_date"?: string | null,"birth_precision"?: string,"breed"?: string | null,"candle_count"?: number,"cover_photo_id"?: string | null,"created_at"?: string,"death_date"?: string | null,"death_precision"?: string,"dedication"?: string | null,"draft_step"?: number,"favorite_place"?: string | null,"favorite_toy"?: string | null,"favorite_treat"?: string | null,"funny_habits"?: string | null,"guestbook_mode"?: string,"id"?: string,"name"?: string,"nicknames"?: (string)[],"owner_id"?: string,"published_at"?: string | null,"sex"?: string | null,"share_key"?: string,"slug"?: string,"species"?: string | null,"status"?: string,"story_md"?: string | null,"theme"?: string,"tier"?: string,"traits"?: (string)[],"updated_at"?: string,"video_url"?: string | null,"visibility"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "memorials_cover_photo_fk"
      columns: ["cover_photo_id"]
isOneToOne: false
      referencedRelation: "memorial_photos"
      referencedColumns: ["id"]
    }
                  ]
                },"order_lines": {
                  Row: {
                    "discount_cents": number,"discount_reason": string | null,"id": string,"kind": string,"memorial_id": string | null,"meta": NonNullable<Json>,"order_id": string,"position": number,"product_key": string,"total_cents": number,"unit_amount_cents": number
                  }
                  ComputedFields: never
                  Insert: {
                    "discount_cents"?: number,"discount_reason"?: string | null,"id"?: string,"kind": string,"memorial_id"?: string | null,"meta"?: NonNullable<Json>,"order_id": string,"position"?: number,"product_key": string,"total_cents": number,"unit_amount_cents": number
                  }
                  Update: {
                    "discount_cents"?: number,"discount_reason"?: string | null,"id"?: string,"kind"?: string,"memorial_id"?: string | null,"meta"?: NonNullable<Json>,"order_id"?: string,"position"?: number,"product_key"?: string,"total_cents"?: number,"unit_amount_cents"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "order_lines_memorial_id_fkey"
      columns: ["memorial_id"]
isOneToOne: false
      referencedRelation: "memorials"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "order_lines_order_id_fkey"
      columns: ["order_id"]
isOneToOne: false
      referencedRelation: "orders"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "order_lines_product_key_fkey"
      columns: ["product_key"]
isOneToOne: false
      referencedRelation: "products"
      referencedColumns: ["key"]
    }
                  ]
                },"orders": {
                  Row: {
                    "attribution": Json | null,"created_at": string,"currency": string,"discount_cents": number,"email": string | null,"id": string,"paid_at": string | null,"promo_code_id": string | null,"refunded_at": string | null,"status": string,"stripe_checkout_session_id": string | null,"stripe_payment_intent_id": string | null,"subtotal_cents": number,"total_cents": number,"user_id": string | null,"withdrawal_waiver_at": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "attribution"?: Json | null,"created_at"?: string,"currency"?: string,"discount_cents"?: number,"email"?: string | null,"id"?: string,"paid_at"?: string | null,"promo_code_id"?: string | null,"refunded_at"?: string | null,"status"?: string,"stripe_checkout_session_id"?: string | null,"stripe_payment_intent_id"?: string | null,"subtotal_cents": number,"total_cents": number,"user_id"?: string | null,"withdrawal_waiver_at"?: string | null
                  }
                  Update: {
                    "attribution"?: Json | null,"created_at"?: string,"currency"?: string,"discount_cents"?: number,"email"?: string | null,"id"?: string,"paid_at"?: string | null,"promo_code_id"?: string | null,"refunded_at"?: string | null,"status"?: string,"stripe_checkout_session_id"?: string | null,"stripe_payment_intent_id"?: string | null,"subtotal_cents"?: number,"total_cents"?: number,"user_id"?: string | null,"withdrawal_waiver_at"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "orders_promo_code_id_fkey"
      columns: ["promo_code_id"]
isOneToOne: false
      referencedRelation: "promo_codes"
      referencedColumns: ["id"]
    }
                  ]
                },"partner_commissions": {
                  Row: {
                    "base_cents": number,"commission_cents": number,"created_at": string,"id": string,"order_id": string,"paid_at": string | null,"partner_id": string,"payout_note": string | null,"status": string
                  }
                  ComputedFields: never
                  Insert: {
                    "base_cents": number,"commission_cents": number,"created_at"?: string,"id"?: string,"order_id": string,"paid_at"?: string | null,"partner_id": string,"payout_note"?: string | null,"status"?: string
                  }
                  Update: {
                    "base_cents"?: number,"commission_cents"?: number,"created_at"?: string,"id"?: string,"order_id"?: string,"paid_at"?: string | null,"partner_id"?: string,"payout_note"?: string | null,"status"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "partner_commissions_order_id_fkey"
      columns: ["order_id"]
isOneToOne: true
      referencedRelation: "orders"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "partner_commissions_partner_id_fkey"
      columns: ["partner_id"]
isOneToOne: false
      referencedRelation: "partners"
      referencedColumns: ["id"]
    }
                  ]
                },"partners": {
                  Row: {
                    "active": boolean,"commission_type": string,"commission_value": number,"contact": string | null,"created_at": string,"id": string,"name": string,"notes": string | null,"type": string
                  }
                  ComputedFields: never
                  Insert: {
                    "active"?: boolean,"commission_type"?: string,"commission_value"?: number,"contact"?: string | null,"created_at"?: string,"id"?: string,"name": string,"notes"?: string | null,"type": string
                  }
                  Update: {
                    "active"?: boolean,"commission_type"?: string,"commission_value"?: number,"contact"?: string | null,"created_at"?: string,"id"?: string,"name"?: string,"notes"?: string | null,"type"?: string
                  }
                  Relationships: [
                    
                  ]
                },"products": {
                  Row: {
                    "active": boolean,"key": string,"name": string,"unit_amount_cents": number,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "active"?: boolean,"key": string,"name": string,"unit_amount_cents": number,"updated_at"?: string
                  }
                  Update: {
                    "active"?: boolean,"key"?: string,"name"?: string,"unit_amount_cents"?: number,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"profiles": {
                  Row: {
                    "created_at": string,"display_name": string | null,"id": string,"role": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"display_name"?: string | null,"id": string,"role"?: string,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"display_name"?: string | null,"id"?: string,"role"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"promo_codes": {
                  Row: {
                    "active": boolean,"applies_to": (string)[],"code": string,"created_at": string,"discount_type": string,"discount_value": number,"id": string,"kind": string,"max_redemptions": number | null,"partner_id": string | null,"redeemed_count": number,"valid_from": string | null,"valid_to": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "active"?: boolean,"applies_to"?: (string)[],"code": string,"created_at"?: string,"discount_type": string,"discount_value": number,"id"?: string,"kind"?: string,"max_redemptions"?: number | null,"partner_id"?: string | null,"redeemed_count"?: number,"valid_from"?: string | null,"valid_to"?: string | null
                  }
                  Update: {
                    "active"?: boolean,"applies_to"?: (string)[],"code"?: string,"created_at"?: string,"discount_type"?: string,"discount_value"?: number,"id"?: string,"kind"?: string,"max_redemptions"?: number | null,"partner_id"?: string | null,"redeemed_count"?: number,"valid_from"?: string | null,"valid_to"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "promo_codes_partner_id_fkey"
      columns: ["partner_id"]
isOneToOne: false
      referencedRelation: "partners"
      referencedColumns: ["id"]
    }
                  ]
                },"rate_limits": {
                  Row: {
                    "count": number,"key": string,"window_start": string
                  }
                  ComputedFields: never
                  Insert: {
                    "count"?: number,"key": string,"window_start": string
                  }
                  Update: {
                    "count"?: number,"key"?: string,"window_start"?: string
                  }
                  Relationships: [
                    
                  ]
                },"reports": {
                  Row: {
                    "created_at": string,"details": string | null,"handled_by": string | null,"id": string,"ip_hash": string | null,"memorial_id": string | null,"reason": string,"reporter_email": string | null,"status": string,"target_id": string,"target_type": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"details"?: string | null,"handled_by"?: string | null,"id"?: string,"ip_hash"?: string | null,"memorial_id"?: string | null,"reason": string,"reporter_email"?: string | null,"status"?: string,"target_id": string,"target_type": string
                  }
                  Update: {
                    "created_at"?: string,"details"?: string | null,"handled_by"?: string | null,"id"?: string,"ip_hash"?: string | null,"memorial_id"?: string | null,"reason"?: string,"reporter_email"?: string | null,"status"?: string,"target_id"?: string,"target_type"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "reports_memorial_id_fkey"
      columns: ["memorial_id"]
isOneToOne: false
      referencedRelation: "memorials"
      referencedColumns: ["id"]
    }
                  ]
                },"settings": {
                  Row: {
                    "active_shelter_id": string | null,"donation_per_memorial_cents": number,"id": boolean,"repeat_discount_pct": number,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "active_shelter_id"?: string | null,"donation_per_memorial_cents"?: number,"id"?: boolean,"repeat_discount_pct"?: number,"updated_at"?: string
                  }
                  Update: {
                    "active_shelter_id"?: string | null,"donation_per_memorial_cents"?: number,"id"?: boolean,"repeat_discount_pct"?: number,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "settings_active_shelter_id_fkey"
      columns: ["active_shelter_id"]
isOneToOne: false
      referencedRelation: "shelters"
      referencedColumns: ["id"]
    }
                  ]
                },"shelters": {
                  Row: {
                    "active": boolean,"created_at": string,"id": string,"name": string,"url": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "active"?: boolean,"created_at"?: string,"id"?: string,"name": string,"url"?: string | null
                  }
                  Update: {
                    "active"?: boolean,"created_at"?: string,"id"?: string,"name"?: string,"url"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"stripe_events": {
                  Row: {
                    "error": string | null,"event_id": string,"processed_at": string | null,"received_at": string,"type": string
                  }
                  ComputedFields: never
                  Insert: {
                    "error"?: string | null,"event_id": string,"processed_at"?: string | null,"received_at"?: string,"type": string
                  }
                  Update: {
                    "error"?: string | null,"event_id"?: string,"processed_at"?: string | null,"received_at"?: string,"type"?: string
                  }
                  Relationships: [
                    
                  ]
                },"timeline_events": {
                  Row: {
                    "body": string | null,"created_at": string,"date_precision": string,"event_date": string | null,"id": string,"memorial_id": string,"photo_id": string | null,"sort_order": number,"title": string
                  }
                  ComputedFields: never
                  Insert: {
                    "body"?: string | null,"created_at"?: string,"date_precision"?: string,"event_date"?: string | null,"id"?: string,"memorial_id": string,"photo_id"?: string | null,"sort_order"?: number,"title": string
                  }
                  Update: {
                    "body"?: string | null,"created_at"?: string,"date_precision"?: string,"event_date"?: string | null,"id"?: string,"memorial_id"?: string,"photo_id"?: string | null,"sort_order"?: number,"title"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "timeline_events_memorial_id_fkey"
      columns: ["memorial_id"]
isOneToOne: false
      referencedRelation: "memorials"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "timeline_events_photo_id_fkey"
      columns: ["photo_id"]
isOneToOne: false
      referencedRelation: "memorial_photos"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "admin_set_memorial_hidden":
{ Args: { "p_hidden": boolean,"p_id": string }; Returns: undefined
                           },
"apply_entitlement":
{ Args: { "p_entitlement_id": string,"p_memorial_id": string }; Returns: undefined
                           },
"can_edit_memorial":
{ Args: { "p_memorial_id": string }; Returns: boolean
                           },
"can_view_memorial":
{ Args: { "p_memorial_id": string }; Returns: boolean
                           },
"candles_since":
{ Args: { "p_memorial_id": string,"p_since": string }; Returns: number
                           },
"check_rate_limit":
{ Args: { "p_key": string,"p_max": number,"p_window_seconds": number }; Returns: boolean
                           },
"claim_drafts":
{ Args: { "p_token": string }; Returns: number
                           },
"create_draft_claim":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"create_memorial_draft":
{ Args: { "p_attribution"?: Json }; Returns: string
                           },
"create_order":
{ Args: { "p_lines": Json,"p_order": Json }; Returns: string
                           },
"donation_totals":
{ Args: Record<PropertyKey, never>; Returns: {
              "accrued_cents": number,"paid_out_cents": number
            }[]
                           },
"finalize_publish":
{ Args: { "p_id": string }; Returns: string
                           },
"fulfill_order":
{ Args: { "p_email": string,"p_order_id": string,"p_payment_intent": string }; Returns: Json
                           },
"is_admin":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"is_member":
{ Args: { "p_memorial_id": string }; Returns: boolean
                           },
"memorial_share_key":
{ Args: { "p_id": string }; Returns: string
                           },
"publish_memorial":
{ Args: { "p_id": string }; Returns: string
                           },
"redeem_gift":
{ Args: { "p_code": string }; Returns: string
                           },
"refund_order":
{ Args: { "p_order_id": string }; Returns: Json
                           },
"request_share_key":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"set_memorial_visibility":
{ Args: { "p_id": string,"p_visibility": string }; Returns: undefined
                           },
"slugify":
{ Args: { "p": string }; Returns: string
                           },
"try_uuid":
{ Args: { "p": string }; Returns: string
                           },
"unpublish_memorial":
{ Args: { "p_id": string }; Returns: undefined
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            
          }
        }
} as const
