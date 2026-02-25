import type {
	ILoadOptionsFunctions,
	INodeListSearchItems,
	INodeListSearchResult,
} from 'n8n-workflow';
import { zooidApiRequest } from '../shared/transport';

type Channel = {
	id: string;
	name: string;
	description: string | null;
	is_public: boolean;
	strict: boolean;
	event_count: number;
};

type TokenClaims = {
	scope: string;
	channel?: string;
	channels?: string[];
};

export async function getChannels(
	this: ILoadOptionsFunctions,
	filter?: string,
): Promise<INodeListSearchResult> {
	let channels: Channel[] = [];

	try {
		const [channelsResponse, claims] = await Promise.all([
			zooidApiRequest.call(this, 'GET', '/api/v1/channels'),
			zooidApiRequest.call(this, 'GET', '/api/v1/tokens/claims') as Promise<TokenClaims>,
		]);

		channels = channelsResponse.channels ?? channelsResponse;

		// Publish tokens are scoped to specific channels
		if (claims.scope === 'publish') {
			const allowed = claims.channels ?? (claims.channel ? [claims.channel] : []);
			if (allowed.length > 0) {
				channels = channels.filter((ch) => allowed.includes(ch.id));
			}
		}
	} catch {
		// token may not have permission
	}

	let results: INodeListSearchItems[] = channels.map((ch) => ({
		name: ch.name || ch.id,
		value: ch.id,
		url: ch.description ?? undefined,
	}));

	if (filter) {
		const lower = filter.toLowerCase();
		results = results.filter(
			(r) =>
				r.name.toLowerCase().includes(lower) || r.value.toString().toLowerCase().includes(lower),
		);
	}

	return { results };
}
