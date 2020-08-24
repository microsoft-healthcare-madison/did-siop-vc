import emptyVc from './fixtures/vc-empty.json';
import deepcopy from 'deepcopy';
import * as uuid from 'uuid';
import crypto from 'crypto'

import { randomBytes } from 'crypto';
import base64url from 'base64url';
import { relative } from 'path';

const generateUri = () => `urn:uuid:${uuid.v4()}`

interface Entry {
    fullUrl: string;
    resource: any;
}


const unique = (values: string[]): string[]  => {
    let ret = Object.keys(values.reduce((types, t) => {types[t]=true; return types}, {}));
    ret.sort();
    return ret;
}
export const createVc = (presentationContext: string, types: string[], issuer: string, subject: string, fhirIdentityResource: any, fhirClniicalResources: any[]) => {
    const vc: VC = deepcopy(emptyVc);

    vc.issuanceDate = new Date(vc.issuanceDate).toISOString()

    const identityEntry: Entry = {
        fullUrl: generateUri(),
        resource: fhirIdentityResource
    }

    const clinicalEntries = fhirClniicalResources.map(r => ({
        fullUrl: generateUri(),
        resource: {
            ...r,
            subject: {
                reference: identityEntry.fullUrl
            }
        }
    }))

    vc.issuer = issuer;

    vc.type = unique([presentationContext, ...types])
    vc.credentialSubject.id = subject;
    vc.credentialSubject.fhirBundle.entry = [identityEntry, ...clinicalEntries]
    return vc
}

interface VC {
    "@context": string[],
    type: string[],
    id?: string;
    issuer?: string;
    issuanceDate?: string;
    expirationDate?: string;
    credentialSubject: {
        id: string,
        fhirBundle: any
    }
}

interface VcJWTPayload {
    sub: string;
    jti?: string;
    iss: string;
    iat: number;
    exp?: number;
    nbf?: number;
    nonce: string;
    vc: any;
}

export const isoToNumericDate = (isoDate: string): number => new Date(isoDate).getTime() / 1000
export const numericToIsoDate = (numericDate: number): string => new Date(numericDate*1000).toISOString()

export const vcToJwtPayload = (vcIn: VC): VcJWTPayload => {
    const vc = deepcopy(vcIn) as VC

    const ret: VcJWTPayload = {
        iss: vc.issuer,
        nbf: isoToNumericDate( vc.issuanceDate),
        iat: isoToNumericDate(vc.issuanceDate),
        exp: vc.expirationDate ?  isoToNumericDate(vc.expirationDate) : undefined,
        jti: vc.id,
        sub: vc.credentialSubject.id,
        nonce: base64url.encode(crypto.randomBytes(16)),
        vc: {
            ...vc,
            issuer: undefined,
            issuanceDate: undefined,
            id: undefined,
            credentialSubject: {
                ...vc.credentialSubject,
                id: undefined
            },
        }
    }

    return ret
}

export const jwtPayloadToVc = (pIn: VcJWTPayload): VC => {
    const p = deepcopy(pIn)

    const ret ={
        ...(p.vc),
        vc: undefined,
        issuer: p.iss,
        iss: undefined,
        iat: undefined,
        issuanceDate: numericToIsoDate(p.nbf),
        nbf: undefined,
        id: p.jti,
        jti: undefined,
        credentialSubject: {
            ...(p.vc.credentialSubject),
            id: p.sub
        },
        sub: undefined,
        expirationDate: p.exp ? numericToIsoDate(p.exp) : undefined,
        exp: undefined
    }
    
    delete ret.nonce;
    return JSON.parse(JSON.stringify(ret))
}