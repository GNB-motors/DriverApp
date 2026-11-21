import React, { useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { AppText, Button, colors } from '../../components/ui';
import { useManagerData } from '../context/ManagerDataContext';
import { Screen, RequestState } from '../components/FormControls';
import useOwnerRequest from '../hooks/useOwnerRequest';

const amount = (value, unit = 'L') =>
  value == null
    ? 'Unavailable'
    : `${Number(value).toLocaleString('en-IN', { maximumFractionDigits: 2 })} ${unit}`;

export default function DefLedgerScreen({ navigation }) {
  const { service, branchId } = useManagerData();
  const branch = branchId === 'all' ? undefined : branchId;
  const request = useOwnerRequest(`def-ledger:${branchId}`, () =>
    service.defLedger(branch),
  );
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState(null);
  const data = request.data;
  const totals = data?.totals;
  const vehicles =
    data?.vehicles?.filter((row) =>
      row.registrationNumber?.toLowerCase().includes(search.trim().toLowerCase()),
    ) || [];

  return (
    <Screen navigation={navigation} title="AdBlue / DEF ledger">
      <RequestState request={request} />

      {/* Top action: View diesel fuel entries */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="View diesel fuel entries"
        onPress={() => navigation.navigate('Fuel review')}
        style={{
          backgroundColor: '#FFFFFF',
          borderWidth: 1.5,
          borderColor: '#BFDBFE',
          borderRadius: 16,
          paddingVertical: 13,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 4,
        }}
      >
        <AppText
          style={{ color: '#2563EB', fontWeight: '700', fontSize: 15 }}
        >
          View diesel fuel entries
        </AppText>
      </Pressable>

      {/* Info notice banner */}
      <View
        style={{
          backgroundColor: '#EBF3FF',
          borderRadius: 16,
          borderWidth: 1,
          borderColor: '#BFDBFE',
          padding: 14,
          flexDirection: 'row',
          alignItems: 'center',
          marginBottom: 4,
        }}
      >
        <Ionicons
          name="information-circle"
          size={28}
          color="#2563EB"
        />
        <View
          style={{
            width: 1,
            height: 36,
            backgroundColor: '#93C5FD',
            marginHorizontal: 12,
          }}
        />
        <AppText
          style={{
            flex: 1,
            fontSize: 12.5,
            lineHeight: 18,
            color: '#1E293B',
          }}
        >
          Selected-scope ledger: logged AdBlue, telemetry consumption and
          reconciliation. Each row carries its own coverage window; this is not
          a daily total.
        </AppText>
      </View>

      {/* Totals Summary Card with AdBlue Waterdrop graphic */}
      {totals && (
        <View
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 20,
            padding: 16,
            borderWidth: 1,
            borderColor: '#E2E8F0',
            flexDirection: 'row',
            alignItems: 'center',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.04,
            shadowRadius: 6,
            elevation: 2,
            marginBottom: 4,
          }}
        >
          <View
            style={{
              width: 62,
              height: 72,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <View
              style={{
                width: 52,
                height: 52,
                backgroundColor: '#2563EB',
                borderTopLeftRadius: 4,
                borderTopRightRadius: 26,
                borderBottomRightRadius: 26,
                borderBottomLeftRadius: 26,
                transform: [{ rotate: '-45deg' }],
                alignItems: 'center',
                justifyContent: 'center',
                shadowColor: '#2563EB',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.35,
                shadowRadius: 8,
                elevation: 4,
              }}
            >
              <View
                style={{
                  transform: [{ rotate: '45deg' }],
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <AppText
                  style={{
                    color: '#FFFFFF',
                    fontWeight: '800',
                    fontSize: 11,
                    letterSpacing: 0.2,
                  }}
                >
                  AdBlue
                </AppText>
              </View>
            </View>
          </View>

          <View
            style={{
              width: 1,
              height: '80%',
              backgroundColor: '#E2E8F0',
              marginHorizontal: 16,
            }}
          />

          <View style={{ flex: 1, gap: 5 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <AppText style={{ fontSize: 13, color: '#1E293B' }}>
                Registered vehicles:{' '}
              </AppText>
              <AppText
                style={{ fontSize: 13, fontWeight: '700', color: '#1D4ED8' }}
              >
                {totals.vehicles ?? 'Unavailable'}
              </AppText>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <AppText style={{ fontSize: 13, color: '#1E293B' }}>
                Logged AdBlue:{' '}
              </AppText>
              {data.claimsTracked ? (
                <AppText
                  style={{
                    fontSize: 13,
                    fontWeight: '700',
                    color: '#0F172A',
                  }}
                >
                  {amount(totals.claimedAdblueL)}
                </AppText>
              ) : (
                <View
                  style={{
                    backgroundColor: '#DBEAFE',
                    borderRadius: 999,
                    paddingHorizontal: 8,
                    paddingVertical: 2,
                  }}
                >
                  <AppText
                    style={{
                      fontSize: 11,
                      fontWeight: '600',
                      color: '#1D4ED8',
                    }}
                  >
                    Not logged
                  </AppText>
                </View>
              )}
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <AppText style={{ fontSize: 13, color: '#1E293B' }}>
                DEF burned:{' '}
              </AppText>
              <AppText
                style={{ fontSize: 13, fontWeight: '700', color: '#0F172A' }}
              >
                {amount(totals.telemetryDefL)}
              </AppText>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <AppText style={{ fontSize: 13, color: '#1E293B' }}>
                Sensor fills:{' '}
              </AppText>
              <AppText
                style={{ fontSize: 13, fontWeight: '700', color: '#0F172A' }}
              >
                {amount(totals.sensorFillL)}
              </AppText>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <AppText style={{ fontSize: 13, color: '#1E293B' }}>
                Fleet dosing:{' '}
              </AppText>
              <AppText
                style={{ fontSize: 13, fontWeight: '700', color: '#0F172A' }}
              >
                {amount(totals.dosingRatioPct, '%')}
              </AppText>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <AppText style={{ fontSize: 13, color: '#1E293B' }}>
                Flagged vehicles:{' '}
              </AppText>
              <AppText
                style={{ fontSize: 13, fontWeight: '700', color: '#0F172A' }}
              >
                {totals.flagged ?? 0}
              </AppText>
            </View>
          </View>
        </View>
      )}

      {/* Search Header and Input */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          marginTop: 8,
          marginBottom: 8,
        }}
      >
        <MaterialCommunityIcons
          name="car"
          size={18}
          color="#2563EB"
          style={{ marginRight: 6 }}
        />
        <AppText
          style={{
            fontSize: 12,
            fontWeight: '700',
            color: '#1E293B',
            letterSpacing: 0.5,
          }}
        >
          SEARCH VEHICLE
        </AppText>
        <View
          style={{
            flex: 1,
            height: 1,
            backgroundColor: '#E2E8F0',
            marginLeft: 12,
          }}
        />
      </View>

      <View
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: 14,
          borderWidth: 1,
          borderColor: '#E2E8F0',
          paddingHorizontal: 14,
          paddingVertical: 10,
          flexDirection: 'row',
          alignItems: 'center',
          marginBottom: 16,
        }}
      >
        <Ionicons
          name="search-outline"
          size={18}
          color="#94A3B8"
          style={{ marginRight: 8 }}
        />
        <TextInput
          placeholder="Search by vehicle..."
          placeholderTextColor="#94A3B8"
          value={search}
          onChangeText={setSearch}
          autoCapitalize="none"
          autoCorrect={false}
          style={{
            flex: 1,
            fontSize: 14,
            color: '#0F172A',
            padding: 0,
          }}
        />
      </View>

      {/* Vehicle Cards */}
      {vehicles.map((row) => (
        <View
          key={row.vehicleId || row.registrationNumber}
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 20,
            padding: 16,
            borderWidth: 1,
            borderColor: '#E2E8F0',
            marginBottom: 16,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.04,
            shadowRadius: 6,
            elevation: 2,
          }}
        >
          {/* Card Header */}
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View
              style={{
                width: 46,
                height: 46,
                borderRadius: 12,
                backgroundColor: '#DBEAFE',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: 14,
              }}
            >
              <MaterialCommunityIcons
                name="truck"
                size={24}
                color="#2563EB"
              />
            </View>
            <View style={{ flex: 1 }}>
              <AppText
                style={{ fontSize: 17, fontWeight: '700', color: '#0F172A' }}
              >
                {row.registrationNumber}
              </AppText>
              <View
                style={{
                  backgroundColor: '#E2E8F0',
                  borderRadius: 999,
                  paddingHorizontal: 8,
                  paddingVertical: 2,
                  alignSelf: 'flex-start',
                  marginTop: 3,
                }}
              >
                <AppText
                  style={{ fontSize: 11, fontWeight: '700', color: '#475569' }}
                >
                  {row.status}
                </AppText>
              </View>
            </View>
          </View>

          {/* Metrics block */}
          <View style={{ marginTop: 12, gap: 3 }}>
            <AppText style={{ fontSize: 13, color: '#334155' }}>
              Logged:{' '}
              <AppText style={{ fontWeight: '500' }}>
                {data.claimsTracked
                  ? amount(row.claimedAdblueL)
                  : 'Not logged'}
              </AppText>{' '}
              · Burned:{' '}
              <AppText style={{ fontWeight: '700', color: '#0F172A' }}>
                {amount(row.telemetryDefL)}
              </AppText>
            </AppText>
            <AppText style={{ fontSize: 13, color: '#334155' }}>
              Sensor fills:{' '}
              <AppText style={{ fontWeight: '500' }}>
                {amount(row.sensorFillL)}
              </AppText>{' '}
              · Balance:{' '}
              <AppText style={{ fontWeight: '500' }}>
                {data.claimsTracked
                  ? amount(row.expectedBalanceL)
                  : 'Not tracked'}
              </AppText>
            </AppText>
            <AppText style={{ fontSize: 13, color: '#334155' }}>
              Dosing:{' '}
              <AppText style={{ fontWeight: '500' }}>
                {amount(row.dosingRatioPct, '%')}
              </AppText>{' '}
              · Normal {row.defBand?.min ?? data.defBand?.min ?? '—'}–
              {row.defBand?.max ?? data.defBand?.max ?? '—'}%
            </AppText>
          </View>

          {/* Toggle Evidence Button */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              expanded === row.registrationNumber
                ? 'Hide evidence'
                : 'Show evidence'
            }
            onPress={() =>
              setExpanded(
                expanded === row.registrationNumber
                  ? null
                  : row.registrationNumber,
              )
            }
            style={{
              backgroundColor: '#FFFFFF',
              borderWidth: 1.5,
              borderColor: '#2563EB',
              borderRadius: 14,
              paddingVertical: 10,
              paddingHorizontal: 16,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              marginTop: 12,
              marginBottom: expanded === row.registrationNumber ? 12 : 0,
            }}
          >
            <Ionicons
              name={
                expanded === row.registrationNumber ? 'eye' : 'eye-outline'
              }
              size={18}
              color="#2563EB"
              style={{ marginRight: 8 }}
            />
            <AppText
              style={{ color: '#2563EB', fontWeight: '700', fontSize: 14 }}
            >
              {expanded === row.registrationNumber
                ? 'Hide evidence'
                : 'Show evidence'}
            </AppText>
          </Pressable>

          {/* Expanded evidence */}
          {expanded === row.registrationNumber && (
            <View style={{ marginTop: 6, gap: 10 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons
                  name="calendar-outline"
                  size={16}
                  color="#2563EB"
                  style={{ marginRight: 8 }}
                />
                <AppText style={{ fontSize: 12, color: '#334155', flex: 1 }}>
                  Coverage:{' '}
                  {row.coverageFrom
                    ? new Date(row.coverageFrom).toLocaleString()
                    : 'Unavailable'}{' '}
                  –{' '}
                  {row.coverageTo
                    ? new Date(row.coverageTo).toLocaleString()
                    : 'Unavailable'}
                </AppText>
              </View>

              <View>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    marginBottom: 2,
                  }}
                >
                  <Ionicons
                    name="flag"
                    size={15}
                    color="#2563EB"
                    style={{ marginRight: 8 }}
                  />
                  <AppText
                    style={{
                      fontSize: 13,
                      fontWeight: '700',
                      color: '#0F172A',
                    }}
                  >
                    Flags
                  </AppText>
                </View>
                {row.flags?.length ? (
                  row.flags.map((flag, index) => (
                    <AppText
                      key={index}
                      style={{
                        fontSize: 13,
                        color: '#475569',
                        marginLeft: 23,
                        marginTop: 2,
                      }}
                    >
                      {flag.type || flag.kind || 'Flag'} ·{' '}
                      {flag.message || flag.note || ''}{' '}
                      {flag.litres == null ? '' : amount(flag.litres)}
                    </AppText>
                  ))
                ) : (
                  <AppText
                    style={{
                      fontSize: 13,
                      color: '#475569',
                      marginLeft: 23,
                      marginTop: 2,
                    }}
                  >
                    No flags.
                  </AppText>
                )}
              </View>

              <View>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    marginBottom: 2,
                  }}
                >
                  <Ionicons
                    name="pulse"
                    size={16}
                    color="#2563EB"
                    style={{ marginRight: 8 }}
                  />
                  <AppText
                    style={{
                      fontSize: 13,
                      fontWeight: '700',
                      color: '#0F172A',
                    }}
                  >
                    Sensor fills
                  </AppText>
                </View>
                {row.fills?.length ? (
                  row.fills.map((fill, index) => (
                    <AppText
                      key={index}
                      style={{
                        fontSize: 13,
                        color: '#475569',
                        marginLeft: 24,
                        marginTop: 2,
                      }}
                    >
                      {fill.at || fill.startAt
                        ? new Date(fill.at || fill.startAt).toLocaleString()
                        : 'Time unavailable'}{' '}
                      · {amount(fill.litres ?? fill.deltaL)}
                    </AppText>
                  ))
                ) : (
                  <AppText
                    style={{
                      fontSize: 13,
                      color: '#475569',
                      marginLeft: 24,
                      marginTop: 2,
                    }}
                  >
                    No sensor fills.
                  </AppText>
                )}
              </View>
            </View>
          )}
        </View>
      ))}

      {data && !vehicles.length && (
        <AppText muted center style={{ marginVertical: 20 }}>
          No vehicles match this search.
        </AppText>
      )}

      <Button
        label="Refresh"
        variant="secondary"
        onPress={request.reload}
        disabled={request.loading}
      />
    </Screen>
  );
}
