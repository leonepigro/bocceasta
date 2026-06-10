export type Team = {
  id: string
  user_id: string | null
  team_name: string
  owner_name: string
  budget_remaining: number
  created_at: string
}

export type Player = {
  id: number
  name: string
  serie_a_team: string | null
  roles: string[]
  classic_role: string | null
  fvm: number | null
  presenze: number | null
  is_sold: boolean
  sold_to_team_id: string | null
  sold_price: number | null
  created_at: string
}

export type AuctionStatus = 'active' | 'sold' | 'cancelled'

export type Auction = {
  id: string
  player_id: number
  started_by_team_id: string
  status: AuctionStatus
  current_price: number
  current_winner_team_id: string | null
  expires_at: string
  created_at: string
}

export type AuctionWithPlayer = Auction & {
  players: Pick<Player, 'id' | 'name' | 'serie_a_team' | 'roles' | 'fvm'>
  teams_winner: Pick<Team, 'id' | 'team_name'> | null
}

export type Bid = {
  id: string
  auction_id: string
  team_id: string
  amount: number
  placed_at: string
}

export type Config = {
  id: number
  enabled_roles: string[]
  max_active_auctions_total: number
  max_active_auctions_per_team: number
  auction_duration_hours: number
  last_minute_extension_minutes: number
  last_minute_threshold_minutes: number
}

export type RosterRequirement = {
  id: number
  role: string
  min_count: number
  max_count: number
}

export type Target = {
  id: string
  team_id: string
  player_id: number
  max_price: number
  created_at: string
}

export type PlayerImport = {
  id: number
  name: string
  serie_a_team: string | null
  roles: string[]
  classic_role: string | null
  fvm: number | null
  presenze: number | null
}
