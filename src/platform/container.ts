/**
 * Punto único de composición (PLAN §2 "Infraestructura").
 * Aquí se ensamblan adaptadores con casos de uso: es el único lugar que
 * conoce las implementaciones concretas.
 *
 * Server-only: importar exclusivamente desde Server Components, Server
 * Actions o Route Handlers.
 */
import {
  createSearchProperties,
  createGetFeaturedProperties,
  createGetRecentProperties,
  createGetSimilarProperties,
} from "@/application/use-cases/search-properties";
import {
  createGetPropertyBySlug,
  createUpdateProperty,
  createChangePropertyStatus,
} from "@/application/use-cases/property-lifecycle";
import { createCreateProperty } from "@/application/use-cases/create-property";
import { createSubmitInquiry } from "@/application/use-cases/submit-inquiry";
import { createListInquiries } from "@/application/use-cases/list-inquiries";
import { createUpdateInquiryStatus } from "@/application/use-cases/update-inquiry-status";
import { createGetCatalogSummary } from "@/application/use-cases/get-catalog-summary";
import {
  createSearchAuctions,
  createGetUpcomingAuctions,
  createGetFeaturedAuctions,
  createGetAuctionBySlug,
} from "@/application/use-cases/search-auctions";
import {
  createSearchMachinery,
  createGetRecentMachinery,
  createGetFeaturedMachinery,
  createGetMachineryBySlug,
} from "@/application/use-cases/search-machinery";
import {
  createCreateAuction,
  createUpdateAuction,
  createSetAuctionEventStatus,
  createChangeAuctionStatus,
} from "@/application/use-cases/auction-lifecycle";
import {
  createCreateMachinery,
  createUpdateMachinery,
  createChangeMachineryStatus,
} from "@/application/use-cases/machinery-lifecycle";
import { PostgresPropertyRepository } from "@/adapters/persistence/postgres-property-repository";
import { PostgresAuctionRepository } from "@/adapters/persistence/postgres-auction-repository";
import { PostgresMachineryRepository } from "@/adapters/persistence/postgres-machinery-repository";
import { PostgresCatalogRepository } from "@/adapters/persistence/postgres-catalog-repository";
import { PostgresInquiryRepository } from "@/adapters/persistence/postgres-inquiry-repository";
import {
  InMemoryPropertyRepository,
  InMemoryAuctionRepository,
  InMemoryMachineryRepository,
  InMemoryCatalogRepository,
  InMemoryInquiryRepository,
} from "@/adapters/persistence/in-memory-repositories";
import { LocalImageStorage } from "@/adapters/storage/local-image-storage";
import type { ImageStorage } from "@/application/ports/image-storage";
import { NoopMapProvider } from "@/adapters/map/noop-map-provider";
import { WhatsAppContactChannel } from "@/adapters/contact/whatsapp-contact-channel";
import { systemClock, cryptoIdGenerator } from "@/infrastructure/system";
import { envPublic, isPostgresConfigured } from "@/infrastructure/config/env";

const usePostgres = isPostgresConfigured();

const propertyRepository = usePostgres
  ? new PostgresPropertyRepository()
  : new InMemoryPropertyRepository();
const auctionRepository = usePostgres
  ? new PostgresAuctionRepository()
  : new InMemoryAuctionRepository();
const machineryRepository = usePostgres
  ? new PostgresMachineryRepository()
  : new InMemoryMachineryRepository();
const catalogRepository = usePostgres
  ? new PostgresCatalogRepository()
  : new InMemoryCatalogRepository();
const inquiryRepository = usePostgres
  ? new PostgresInquiryRepository()
  : new InMemoryInquiryRepository();
const imageStorage: ImageStorage = new LocalImageStorage();
const mapProvider = new NoopMapProvider();
const whatsappChannel = new WhatsAppContactChannel(envPublic.NEXT_PUBLIC_WHATSAPP_NUMBER);

export const container = {
  // Infraestructura / adaptadores
  repos: {
    property: propertyRepository,
    auction: auctionRepository,
    machinery: machineryRepository,
    catalog: catalogRepository,
    inquiry: inquiryRepository,
  },
  storage: {
    images: imageStorage,
  },
  map: mapProvider,
  channels: {
    whatsapp: whatsappChannel,
  },
  system: {
    clock: systemClock,
    ids: cryptoIdGenerator,
  },

  // Casos de uso
  useCases: {
    searchProperties: createSearchProperties(propertyRepository),
    getFeaturedProperties: createGetFeaturedProperties(propertyRepository),
    getRecentProperties: createGetRecentProperties(propertyRepository),
    getSimilarProperties: createGetSimilarProperties(propertyRepository),
    getPropertyBySlug: createGetPropertyBySlug(propertyRepository),
    createProperty: createCreateProperty(propertyRepository, systemClock),
    updateProperty: createUpdateProperty(propertyRepository),
    changePropertyStatus: createChangePropertyStatus(propertyRepository),
    submitInquiry: createSubmitInquiry(inquiryRepository),
    listInquiries: createListInquiries(inquiryRepository),
    updateInquiryStatus: createUpdateInquiryStatus(inquiryRepository),
    getCatalogSummary: createGetCatalogSummary(propertyRepository),
    searchAuctions: createSearchAuctions(auctionRepository),
    getUpcomingAuctions: createGetUpcomingAuctions(auctionRepository),
    getFeaturedAuctions: createGetFeaturedAuctions(auctionRepository),
    getAuctionBySlug: createGetAuctionBySlug(auctionRepository),
    createAuction: createCreateAuction(auctionRepository, systemClock),
    updateAuction: createUpdateAuction(auctionRepository),
    setAuctionEventStatus: createSetAuctionEventStatus(auctionRepository),
    changeAuctionStatus: createChangeAuctionStatus(auctionRepository),
    searchMachinery: createSearchMachinery(machineryRepository),
    getRecentMachinery: createGetRecentMachinery(machineryRepository),
    getFeaturedMachinery: createGetFeaturedMachinery(machineryRepository),
    getMachineryBySlug: createGetMachineryBySlug(machineryRepository),
    createMachinery: createCreateMachinery(machineryRepository, systemClock),
    updateMachinery: createUpdateMachinery(machineryRepository),
    changeMachineryStatus: createChangeMachineryStatus(machineryRepository),
  },
} as const;

export type AppContainer = typeof container;
