import type { PlayerSummary } from "@/lib/types";
import Image from "next/image";

const SILHOUETTE = "/player-silhouette.svg";

interface PlayerCardProps {
  player: PlayerSummary;
  onSelect: () => void;
  disabled: boolean;
  isWinner?: boolean;
  isLoser?: boolean;
  onRemovePhoto?: (id: number) => void;
}

export function PlayerCard({ player, onSelect, disabled, isWinner, isLoser, onRemovePhoto }: PlayerCardProps) {
  let cardClass = "player-card";
  if (isWinner) cardClass += " player-card--winner";
  if (isLoser) cardClass += " player-card--loser";
  if (disabled) cardClass += " player-card--disabled";

  return (
    <button
      className={cardClass}
      onClick={onSelect}
      disabled={disabled}
      aria-label={`Select ${player.name}`}
    >
      <div className="player-card__photo">
        {player.team_crest_url && (
          <Image
            className="player-card__crest"
            src={player.team_crest_url}
            alt=""
            width={28}
            height={28}
          />
        )}
        {player.photo_url ? (
          <Image
            key={player.id}
            src={player.photo_url}
            alt={player.name}
            width={96}
            height={96}
            style={{ borderRadius: "50%", objectFit: "cover" }}
          />
        ) : (
          <Image
            key={player.id}
            src={SILHOUETTE}
            alt={player.name}
            width={96}
            height={96}
            style={{ borderRadius: "50%", objectFit: "cover" }}
          />
        )}
        {player.shirt_number && (
          <span className="player-card__number">{player.shirt_number}</span>
        )}
        {onRemovePhoto && player.photo_url && (
          <button
            className="player-card__remove-photo"
            onClick={(e) => {
              e.stopPropagation();
              onRemovePhoto(player.id);
            }}
            title="Remove photo"
            aria-label="Remove photo"
          >
            ×
          </button>
        )}
      </div>
      <div className="player-card__info">
        <h3 className="player-card__name">{player.name}</h3>
        <div className="player-card__meta">
          {player.team_name && (
            <span className="player-card__team">{player.team_name}</span>
          )}
          {player.position_group && (
            <span className="player-card__position">{player.position_group}</span>
          )}
          {player.nationality && (
            <span className="player-card__nationality">{player.nationality}</span>
          )}
        </div>
      </div>
    </button>
  );
}
