import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MediaGroupCard } from '../components/cards/MediaCards';

const player = (state) => ({ state, attributes: { friendly_name: 'Player' } });

const renderGroup = (states) => {
  const entities = Object.fromEntries(
    states.map((state, index) => [
      `media_player.p${index}`,
      { ...player(state), entity_id: `media_player.p${index}` },
    ])
  );
  return render(
    <MediaGroupCard
      cardId="media_group_1"
      entities={entities}
      cardSettings={{ group: { mediaIds: Object.keys(entities) } }}
      settingsKey="group"
      customNames={{}}
      customIcons={{}}
      getA={() => null}
      getEntityImageUrl={() => null}
      callService={() => {}}
      isMediaActive={() => false}
      saveCardSetting={() => {}}
      onOpen={() => {}}
      t={(key) => key}
    />
  );
};

describe('MediaGroupCard when players are unavailable', () => {
  it('says so when every player is unavailable', () => {
    const { container } = renderGroup(['unavailable', 'unavailable']);
    expect(container).toHaveTextContent('status.unavailable');
    expect(container).not.toHaveTextContent('media.noneMusic');
  });

  it('keeps the normal text while one player is still there', () => {
    const { container } = renderGroup(['unavailable', 'idle']);
    expect(container).toHaveTextContent('media.noneMusic');
    expect(container).not.toHaveTextContent('status.unavailable');
  });
});
